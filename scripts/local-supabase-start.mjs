import { resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { openSync, mkdirSync } from 'node:fs';
const env = {
  ...process.env,
  SUPABASE_HOME: process.env.SUPABASE_HOME ?? resolve('..', '.supabase'),
  SUPABASE_TELEMETRY_DISABLED: 'true',
};
mkdirSync('supabase/.temp', { recursive: true });
const names = [
  'supabase_db_fitspace',
  'supabase_kong_fitspace',
  'supabase_auth_fitspace',
  'supabase_storage_fitspace',
  'supabase_inbucket_fitspace',
  'supabase_rest_fitspace',
];
const healthy = () => {
  try {
    const data = JSON.parse(
      execFileSync('docker', ['inspect', ...names], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
    return data.every(
      (item) =>
        item.State.Running &&
        (!item.State.Health || item.State.Health.Status === 'healthy'),
    );
  } catch {
    return false;
  }
};
if (!healthy()) {
  console.log(
    'Starting the isolated FitSpace development stack. Details are in ignored supabase/.temp/start.log.',
  );
  const log = openSync('supabase/.temp/start.log', 'w', 0o600);
  const code = await new Promise((resolve, reject) => {
    const child = spawn(
      'node_modules/.bin/supabase',
      [
        'start',
        '--exclude',
        'realtime,studio,edge-runtime,logflare,vector,supavisor,postgres-meta,imgproxy',
        '--ignore-health-check',
      ],
      { env, stdio: ['ignore', log, log] },
    );
    child.on('error', reject);
    child.on('exit', resolve);
  });
  if (code !== 0)
    throw new Error(
      'Local Supabase start failed. Inspect the local log without sharing credential values.',
    );
  // Initial CLI checks can fail on managed Docker proxy injection. Recheck actual health below.
  execFileSync('python', ['-u', 'scripts/local-container-proxy.py'], {
    stdio: 'inherit',
  });
  const deadline = Date.now() + 120000;
  while (!healthy()) {
    if (Date.now() > deadline)
      throw new Error(
        'Local stack is not healthy. No integration success is claimed.',
      );
    await new Promise((r) => setTimeout(r, 2000));
  }
}
// CLI 3.1 copies public HTML templates with root-only read permissions in
// some rootless Docker installations. Touch only these public template paths.
const changed = execFileSync(
  'docker',
  [
    'exec',
    '--user',
    'root',
    'supabase_kong_fitspace',
    'sh',
    '-c',
    `changed=0; for dir in /home/kong/templates /home/kong/templates/email; do if [ -d "$dir" ] && [ "$(stat -c %a "$dir")" != "755" ]; then chmod 755 "$dir"; changed=1; fi; done; for file in /home/kong/templates/email/magic_link.html /home/kong/templates/email/confirmation.html; do if [ -f "$file" ] && [ "$(stat -c %a "$file")" != "644" ]; then chmod 644 "$file"; changed=1; fi; done; echo "$changed"`,
  ],
  { encoding: 'utf8' },
).trim();
if (changed === '1') {
  execFileSync('docker', ['restart', 'supabase_auth_fitspace'], {
    stdio: 'ignore',
  });
  const deadline = Date.now() + 60000;
  while (!healthy()) {
    if (Date.now() > deadline)
      throw new Error(
        'Auth did not become healthy after loading its email templates.',
      );
    await new Promise((r) => setTimeout(r, 1000));
  }
}
execFileSync(
  'docker',
  [
    'exec',
    'supabase_auth_fitspace',
    'sh',
    '-c',
    'env -u http_proxy -u HTTP_PROXY -u https_proxy -u HTTPS_PROXY wget -qO- http://supabase_kong_fitspace:8088/email/magic_link.html',
  ],
  { stdio: 'ignore' },
);
const response = await fetch('http://127.0.0.1:54321/auth/v1/health');
if (!response.ok) throw new Error('Auth API health check failed.');
execFileSync('node_modules/.bin/supabase', ['db', 'push'], {
  env,
  stdio: 'inherit',
});
execFileSync(process.execPath, ['scripts/local-supabase-env.mjs'], {
  env,
  stdio: 'inherit',
});
console.log('Local Supabase services and Auth API are healthy.');
