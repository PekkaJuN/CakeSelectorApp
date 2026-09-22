import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CREDENTIALS, fixtureConfig, writeConfig, writeFixtureConfig } from '../fixtures/users.js';

const SERVER = fileURLToPath(new URL('../../src/server.js', import.meta.url));
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function freePort() {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function isListening(port) {
  return new Promise(resolve => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(500);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

// Boots src/server.js as a real process, which is the only way to observe
// "exit code 1, message on stderr, no port bound".
function boot(env) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [SERVER], {
      cwd: ROOT,
      env: { ...process.env, ...env }
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = result => {
      if (settled) return;
      settled = true;
      resolve({ child, stdout, stderr, ...result });
    };

    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (/Server running at/.test(stdout)) finish({ started: true, exitCode: null });
    });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('exit', code => finish({ started: false, exitCode: code }));
  });
}

async function bootAndStop(env) {
  const result = await boot(env);
  result.child.kill();
  return result;
}

async function expectRefusedBoot(config, expectedMessage) {
  const port = await freePort();
  const path = typeof config === 'string' ? config : writeConfig(config);

  const result = await bootAndStop({ AUTH_CONFIG_PATH: path, PORT: String(port) });

  assert.strictEqual(result.started, false, `the server must not start. stdout: ${result.stdout}`);
  assert.strictEqual(result.exitCode, 1, `expected exit 1, got ${result.exitCode}`);
  assert.ok(
    result.stderr.includes(expectedMessage),
    `expected stderr to contain "${expectedMessage}", got: ${result.stderr.trim()}`
  );
  assert.strictEqual(await isListening(port), false, 'no port may be bound after a refused boot');

  return result;
}

test('Sweep: boot | the expired-session sweep is started', () => {
  // The sweep timer is unref'd and lives inside a child process, so it cannot be
  // observed from out here; its behaviour is covered in sessions.test.js and this
  // asserts only that boot actually wires it up.
  const source = fs.readFileSync(SERVER, 'utf8');

  assert.ok(/startSweep\s*\(/.test(source), 'server.js must start the session sweep at boot');
  assert.ok(/import .*startSweep.* from '\.\/auth\/sessions\.js'/.test(source),
    'startSweep should come from the session store');
});

// --- startup validation aborts the boot -----------------------------------

test('AC2: boot | missing config | exit 1, names the path, binds no port', async () => {
  const missing = 'config/definitely-not-here.json';

  await expectRefusedBoot(missing, `Auth config not found at ${missing}`);
});

test('AC3: boot | unknown role | exit 1 naming the role and user', async () => {
  const config = await fixtureConfig();
  config.users[0].role = 'superuser';

  await expectRefusedBoot(config, 'Invalid role "superuser" for user "admin"');
});

test('AC4: boot | duplicate username | exit 1', async () => {
  const config = await fixtureConfig();
  config.users[1].username = 'admin';

  await expectRefusedBoot(config, 'Duplicate username in auth config: admin');
});

test('AC5: boot | empty user list | exit 1', async () => {
  const config = await fixtureConfig();
  config.users = [];

  await expectRefusedBoot(config, 'Auth config contains no users');
});

test('AC62: boot | leftover plaintext password | exit 1 pointing at the hash tool', async () => {
  const config = await fixtureConfig();
  config.users[0].password = 'left-in-by-mistake';

  await expectRefusedBoot(config, 'has a plaintext "password" field');
});

test('AC63: boot | unsupported hash algorithm | exit 1', async () => {
  const config = await fixtureConfig();
  config.hash.algorithm = 'md5';

  await expectRefusedBoot(config, 'Unsupported hash algorithm "md5"');
});

test('AC59: boot | non-hex salt | exit 1', async () => {
  const config = await fixtureConfig();
  config.users[0].salt = 'not-hex!!';

  await expectRefusedBoot(config, 'Invalid salt for user "admin": must be hex');
});

// --- a valid config boots and is guarded ----------------------------------

test('AC6: boot | AUTH_CONFIG_PATH override | starts from the fixture, never touching config/users.json', async t => {
  const port = await freePort();
  const path = await writeFixtureConfig();

  const running = await boot({ AUTH_CONFIG_PATH: path, PORT: String(port) });
  t.after(() => running.child.kill());

  assert.strictEqual(running.started, true, `server failed to start: ${running.stderr}`);

  // config/users.json does not exist in this repo, so a server that ignored the
  // override would have exited 1 with "Auth config not found".
  const login = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: CREDENTIALS.admin.username, password: CREDENTIALS.admin.password })
  });

  assert.strictEqual(login.status, 200, 'the fixture users must be the ones loaded');
  assert.deepStrictEqual(await login.json(), { username: 'admin', role: 'admin' });
});

test('AC45: boot | the policy is mounted ahead of the routers | /api is guarded end to end', async t => {
  const port = await freePort();
  const path = await writeFixtureConfig();

  const running = await boot({ AUTH_CONFIG_PATH: path, PORT: String(port) });
  t.after(() => running.child.kill());

  assert.strictEqual(running.started, true, `server failed to start: ${running.stderr}`);
  const base = `http://localhost:${port}`;

  const anonymous = await fetch(`${base}/api/products`);
  assert.strictEqual(anonymous.status, 401, 'an unauthenticated read must be refused');
  assert.deepStrictEqual(await anonymous.json(), { error: 'Unauthorized: valid session required' });

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: CREDENTIALS.orderuser.username, password: CREDENTIALS.orderuser.password })
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const asOrderuser = await fetch(`${base}/api/products`, { headers: { Cookie: cookie } });
  assert.strictEqual(asOrderuser.status, 200, 'an orderuser may read the catalog');

  const forbidden = await fetch(`${base}/api/orders`, { headers: { Cookie: cookie } });
  assert.strictEqual(forbidden.status, 403, 'an orderuser may not list orders');
  assert.deepStrictEqual(await forbidden.json(), { error: 'Access denied: admin only' });
});

test('AC49: boot | the login page is served without a session', async t => {
  const port = await freePort();
  const path = await writeFixtureConfig();

  const running = await boot({ AUTH_CONFIG_PATH: path, PORT: String(port) });
  t.after(() => running.child.kill());

  assert.strictEqual(running.started, true, `server failed to start: ${running.stderr}`);

  // Static assets stay public; only /api is behind the policy.
  const page = await fetch(`http://localhost:${port}/`);
  assert.strictEqual(page.status, 200, 'the app shell must load so it can show a login screen');
});
