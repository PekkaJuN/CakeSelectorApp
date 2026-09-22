import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import authRouter from '../../src/routes/auth.js';
import { loadUsers } from '../../src/auth/userStore.js';
import { destroyAllSessions } from '../../src/auth/sessions.js';
import { CREDENTIALS, writeFixtureConfig } from '../fixtures/users.js';

const { admin: ADMIN, orderuser: ORDERUSER } = CREDENTIALS;

let server;
let baseUrl;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

before(async () => {
  loadUsers(await writeFixtureConfig());
  server = buildApp().listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server?.close());

beforeEach(() => destroyAllSessions());

function post(path, body, cookie) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body ?? {})
  });
}

function get(path, cookie) {
  return fetch(`${baseUrl}${path}`, { headers: cookie ? { Cookie: cookie } : {} });
}

function cookieFrom(response) {
  const raw = response.headers.get('set-cookie');
  return raw ? raw.split(';')[0] : null;
}

async function loginAs(username, password) {
  return cookieFrom(await post('/api/auth/login', { username, password }));
}

// --- POST /api/auth/login -------------------------------------------------

test('AC7: login | admin happy path | 200, the user, and a hardened cookie', async () => {
  const response = await post('/api/auth/login', { username: ADMIN.username, password: ADMIN.password });

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { username: 'admin', role: 'admin' });

  const setCookie = response.headers.get('set-cookie');
  assert.ok(/^cake_session=[0-9a-f]{64}/.test(setCookie), `unexpected cookie: ${setCookie}`);
  assert.ok(/HttpOnly/i.test(setCookie), 'cookie must be HttpOnly');
  assert.ok(/SameSite=Strict/i.test(setCookie), 'cookie must be SameSite=Strict');
  assert.ok(/Path=\/(;|$)/.test(setCookie), 'cookie must be Path=/');
});

test('AC8: login | orderuser happy path | 200 and the orderuser role', async () => {
  const response = await post('/api/auth/login', { username: ORDERUSER.username, password: ORDERUSER.password });

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { username: 'orderuser', role: 'orderuser' });
});

test('AC9: login | uppercase username | 200 and the canonical username', async () => {
  const response = await post('/api/auth/login', { username: ADMIN.username.toUpperCase(), password: ADMIN.password });

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { username: 'admin', role: 'admin' });
});

test('AC10: login | wrong password | 401, shared message, no cookie', async () => {
  const response = await post('/api/auth/login', { username: 'admin', password: 'wrong' });

  assert.strictEqual(response.status, 401);
  assert.deepStrictEqual(await response.json(), { error: 'Invalid username or password' });
  assert.strictEqual(response.headers.get('set-cookie'), null, 'a rejected login must set no cookie');
});

test('AC11: login | unknown username | byte-identical to the wrong-password rejection', async () => {
  const unknown = await post('/api/auth/login', { username: 'nobody', password: 'x' });
  const wrongPassword = await post('/api/auth/login', { username: 'admin', password: 'wrong' });

  assert.strictEqual(unknown.status, wrongPassword.status);
  assert.strictEqual(await unknown.text(), await wrongPassword.text());
  assert.strictEqual(unknown.headers.get('set-cookie'), null);
});

test('AC12: login | missing username | 400', async () => {
  const response = await post('/api/auth/login', { password: ADMIN.password });

  assert.strictEqual(response.status, 400);
  assert.deepStrictEqual(await response.json(), { error: 'Username is required' });
});

test('AC12: login | blank username | 400', async () => {
  const response = await post('/api/auth/login', { username: '   ', password: ADMIN.password });

  assert.strictEqual(response.status, 400);
  assert.deepStrictEqual(await response.json(), { error: 'Username is required' });
});

test('AC13: login | missing password | 400', async () => {
  const response = await post('/api/auth/login', { username: 'admin' });

  assert.strictEqual(response.status, 400);
  assert.deepStrictEqual(await response.json(), { error: 'Password is required' });
});

test('AC7: login | plain HTTP | the cookie carries no Secure attribute', async () => {
  delete process.env.HTTPS;

  const response = await post('/api/auth/login', { username: ADMIN.username, password: ADMIN.password });

  // An unconditional Secure flag means the cookie never comes back over http://localhost.
  assert.ok(!/Secure/i.test(response.headers.get('set-cookie')), 'Secure must not be set on plain HTTP');
});

test('AC7: login | HTTPS=true | the cookie carries Secure', async () => {
  process.env.HTTPS = 'true';

  try {
    const response = await post('/api/auth/login', { username: ADMIN.username, password: ADMIN.password });
    assert.ok(/Secure/i.test(response.headers.get('set-cookie')), 'Secure must be set under HTTPS');
  } finally {
    delete process.env.HTTPS;
  }
});

test('Risk: login | the password never reaches a log line', async () => {
  const written = [];
  const restorers = ['log', 'error', 'warn', 'info'].map(level => {
    const original = console[level];
    console[level] = (...args) => { written.push(args.join(' ')); };
    return () => { console[level] = original; };
  });

  try {
    await post('/api/auth/login', { username: ADMIN.username, password: ADMIN.password });
    await post('/api/auth/login', { username: 'admin', password: `${ADMIN.password}-wrong` });
  } finally {
    restorers.forEach(restore => restore());
  }

  assert.ok(
    !written.some(line => line.includes(ADMIN.password)),
    `a password reached the logs: ${written.join(' | ')}`
  );
});

// --- POST /api/auth/logout ------------------------------------------------

test('AC17: logout | valid session | 200, cookie cleared, old token now rejected', async () => {
  const cookie = await loginAs(ADMIN.username, ADMIN.password);

  const response = await post('/api/auth/logout', {}, cookie);

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { ok: true });
  assert.ok(/Max-Age=0/i.test(response.headers.get('set-cookie')), 'the cookie must be cleared');

  const afterLogout = await get('/api/auth/me', cookie);
  assert.strictEqual(afterLogout.status, 401, 'the old token must stop working');
});

test('AC18: logout | no session | still 200 and {ok: true}', async () => {
  const response = await post('/api/auth/logout', {});

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { ok: true });
});

// --- GET /api/auth/me -----------------------------------------------------

test('AC22: me | valid admin session | 200 with the username and role', async () => {
  const cookie = await loginAs(ADMIN.username, ADMIN.password);

  const response = await get('/api/auth/me', cookie);

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { username: 'admin', role: 'admin' });
});

test('AC8: me | valid orderuser session | 200 with the orderuser role', async () => {
  const cookie = await loginAs(ORDERUSER.username, ORDERUSER.password);

  const response = await get('/api/auth/me', cookie);

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { username: 'orderuser', role: 'orderuser' });
});

test('AC23: me | no cookie | 401 with the standard denial body', async () => {
  const response = await get('/api/auth/me');

  assert.strictEqual(response.status, 401);
  assert.deepStrictEqual(await response.json(), { error: 'Unauthorized: valid session required' });
});

test('AC21: me | forged token | 401', async () => {
  const response = await get('/api/auth/me', 'cake_session=deadbeef');

  assert.strictEqual(response.status, 401);
  assert.deepStrictEqual(await response.json(), { error: 'Unauthorized: valid session required' });
});

test('AC21: me | malformed cookie header | 401 rather than a crash', async () => {
  const response = await get('/api/auth/me', 'garbage');

  assert.strictEqual(response.status, 401);
});

test('AC20: me | expired session | 401 and the cookie is cleared', async () => {
  // A zero-hour TTL makes "expiresAt is already past" deterministic without either
  // a sleep or a faked clock inside a live HTTP server.
  loadUsers(await writeFixtureConfig({ sessionTtlHours: 0 }));

  try {
    const cookie = await loginAs(ADMIN.username, ADMIN.password);
    const response = await get('/api/auth/me', cookie);

    assert.strictEqual(response.status, 401);
    assert.deepStrictEqual(await response.json(), { error: 'Unauthorized: valid session required' });
    assert.ok(/Max-Age=0/i.test(response.headers.get('set-cookie')), 'an expired session must clear the cookie');
  } finally {
    loadUsers(await writeFixtureConfig());
  }
});
