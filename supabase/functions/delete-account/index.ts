import { removeArtifacts } from './storage.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClerkClient, verifyToken } from 'npm:@clerk/backend@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return Response.json({ error: 'method not allowed' }, { status: 405, headers: cors });
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
  if (!token) return Response.json({ error: 'authentication required' }, { status: 401, headers: cors });
  if (!clerkSecretKey) return Response.json({ error: 'account deletion is not configured' }, { status: 500, headers: cors });

  let userId: string;
  try {
    const claims = await verifyToken(token, { secretKey: clerkSecretKey });
    if (!claims.sub) throw new Error('missing user subject');
    userId = claims.sub;
  } catch {
    return Response.json({ error: 'invalid session' }, { status: 401, headers: cors });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  try { await removeArtifacts(admin.storage.from('import-artifacts'), userId); }
  catch { return Response.json({ error: 'Unable to remove account files. Please retry.' }, { status: 500, headers: cors }); }

  const tables = [
    'projects', 'tasks', 'subtasks', 'day_entries', 'day_wins', 'channels', 'content_pieces', 'metric_snapshots',
    'habits', 'habit_logs', 'health_goals', 'shelves', 'books', 'reading_sessions', 'reading_annotations', 'reading_goals',
    'feed_sources', 'feed_items', 'import_runs', 'import_items', 'integration_accounts', 'sync_mutations', 'change_log', 'profiles',
  ];
  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq('owner_id', userId);
    if (error) return Response.json({ error: 'Unable to remove account data. Please retry.' }, { status: 500, headers: cors });
  }

  const clerk = createClerkClient({ secretKey: clerkSecretKey });
  try { await clerk.users.deleteUser(userId); }
  catch { return Response.json({ error: 'Unable to finish account deletion. Please retry.' }, { status: 500, headers: cors }); }
  return Response.json({ deleted: true }, { headers: cors });
});
