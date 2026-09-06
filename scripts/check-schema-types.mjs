import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const files = readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql')).sort();
const hash = createHash('sha256');
for (const file of files) hash.update(readFileSync(`supabase/migrations/${file}`));
const fingerprint = hash.digest('hex');
const types = readFileSync('src/core/database.types.ts', 'utf8');
if (!types.includes(`Migration SHA-256: ${fingerprint}`)) {
  console.error(`Database types are stale. Expected migration fingerprint ${fingerprint}.`);
  process.exit(1);
}
console.log('Database type fingerprint matches migrations.');
