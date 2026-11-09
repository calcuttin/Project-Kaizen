import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Export only application/build sources. Never copy workspace credentials, local
// data, native prototypes, or Git metadata into the independently hosted Site.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, 'apps/bookshelf');
const hosting = JSON.parse(readFileSync(resolve(destination, '.openai/hosting.json'), 'utf8'));
if (!hosting.project_id || hosting.static?.directory !== 'dist') throw new Error('Open the existing Bookshelf Site checkout first.');
const directories = ['src', 'packages', 'public'];
const files = [
  'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
  'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts',
  'index.html', '.env.example', '.gitignore', 'README.md', 'LICENSE', 'TRADEMARKS.md',
  'scripts/guides-plugin.ts', 'scripts/check-bundle-budget.mjs',
  'docs/setup-guide.md', 'docs/user-guide.md', 'docs/local-setup.md',
  'docs/cloud-setup.md', 'docs/development.md', 'docs/operations.md',
  'docs/security/review-2026-09-06.md', 'docs/reviews/shared-bookshelf-account.md',
  'supabase/migrations/202609040001_product_foundation.sql',
  'supabase/migrations/202609060002_clerk_auth.sql',
  'supabase/migrations/202609060003_restrict_anonymous_rpc.sql',
  'supabase/migrations/202610220004_account_deletion_fence.sql',
  'supabase/functions/delete-account/index.ts', 'supabase/functions/delete-account/storage.ts',
];
for (const dir of directories) {
  rmSync(resolve(destination, dir), { recursive: true, force: true });
  cpSync(resolve(root, dir), resolve(destination, dir), { recursive: true });
}
for (const file of files) {
  mkdirSync(dirname(resolve(destination, file)), { recursive: true });
  cpSync(resolve(root, file), resolve(destination, file));
}
writeFileSync(resolve(destination, 'BOOKSHELF.md'), `# Bookshelf shared-account website

This Site uses the Project Kaizen React application and the same Clerk and Supabase services.
Bookshelf is a working name. The native iPhone prototype is separate and is not connected by this change.

Install with pnpm install --frozen-lockfile. Set the public environment variables from .env.example,
using the SAME Clerk publishable key, Supabase URL and Supabase publishable key as Project Kaizen.
Set VITE_KAIZEN_MODE=cloud, VITE_KAIZEN_PRODUCT=bookshelf and VITE_KAIZEN_HASH_ROUTING=true.
Run pnpm build. The Sites static deployment serves dist. Never add secret/service-role keys.

Full Kaizen and Bookshelf are account preferences, not authorization tiers. Users switch in Settings;
their books, tasks and habits remain in the same account. Existing browser-only libraries are copied
only after the user reviews and confirms the import in Settings.

See docs/reviews/shared-bookshelf-account.md for validation and remaining release checks.
`);
// These belonged to the original vanilla prototype and cannot test this build.
rmSync(resolve(destination, 'tests/model.test.mjs'), { force: true });
console.log('Prepared shared Bookshelf sources; no environment files or account data copied.');
