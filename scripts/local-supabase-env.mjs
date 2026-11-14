import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
const raw = execFileSync(
  'node_modules/.bin/supabase',
  ['status', '-o', 'json'],
  {
    env: {
      ...process.env,
      SUPABASE_HOME: process.env.SUPABASE_HOME ?? resolve('..', '.supabase'),
      SUPABASE_TELEMETRY_DISABLED: 'true',
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
const status = JSON.parse(raw),
  url = status.API_URL ?? status.api_url,
  key = status.ANON_KEY ?? status.anon_key;
if (!url || !key || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Expected a running local Supabase stack.');
const existing = existsSync('.env.local')
  ? readFileSync('.env.local', 'utf8')
  : '';
if (/SUPABASE_URL=/.test(existing) && !existing.includes(`SUPABASE_URL=${url}`))
  throw new Error('Refusing to replace a different Supabase configuration.');
const entries = {
  SUPABASE_URL: url,
  SUPABASE_PUBLISHABLE_KEY: key,
  FITSPACE_SITE_URL: 'http://127.0.0.1:3000',
};
let next = existing.replace(
  /^SUPABASE_PUBLISHABLE_KEY=.*$/m,
  `SUPABASE_PUBLISHABLE_KEY=${key}`,
);
for (const [name, value] of Object.entries(entries))
  if (!new RegExp(`^${name}=`, 'm').test(existing))
    next += `\n${name}=${value}`;
writeFileSync('.env.local', next + '\n', { mode: 0o600 });
mkdirSync('supabase/.temp', { recursive: true });
writeFileSync('supabase/.temp/test-status.json', raw, { mode: 0o600 });
console.log(
  'Local application environment and ignored integration bindings written. No secret key was added to the application environment.',
);
