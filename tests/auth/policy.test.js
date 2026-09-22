import { test, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { authPolicy, accessFor } from '../../src/middleware/auth.js';
import { loadUsers } from '../../src/auth/userStore.js';
import { createSession, destroyAllSessions } from '../../src/auth/sessions.js';
import { writeFixtureConfig } from '../fixtures/users.js';

let server;
let baseUrl;
let adminCookie;
let orderuserCookie;
let reached;

before(async () => {
  loadUsers(await writeFixtureConfig());
  destroyAllSessions();

  const app = express();
  app.use(express.json());
  app.use('/api', authPolicy);

  // A catch-all stand-in for every router: if the policy lets a request through,
  // this records it. Testing the table needs no database and no real handlers.
  app.all('/api/*', (req, res) => {
    reached.push(`${req.method} ${req.originalUrl}`);
    res.json({ reached: true, user: req.user ?? null });
  });

  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;

  adminCookie = `cake_session=${createSession({ username: 'admin', role: 'admin' })}`;
  orderuserCookie = `cake_session=${createSession({ username: 'orderuser', role: 'orderuser' })}`;
});

after(() => server?.close());

function call(method, path, cookie) {
  reached = [];
  return fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {})
    },
    ...(method === 'GET' || method === 'DELETE' ? {} : { body: '{}' })
  });
}

// --- the policy table, route by route -------------------------------------

// method, path, what admin gets, what orderuser gets
const MATRIX = [
  ['GET',    '/auth/me',                  200, 200],
  ['GET',    '/products',                 200, 200],
  ['POST',   '/products',                 200, 403],
  ['PUT',    '/products/p1',              200, 403],
  ['DELETE', '/products/p1',              200, 403],
  ['GET',    '/products/p1/properties',   200, 200],
  ['POST',   '/products/p1/properties',   200, 403],
  ['GET',    '/properties/pr1/values',    200, 200],
  ['POST',   '/properties/pr1/values',    200, 403],
  ['DELETE', '/properties/pr1',           200, 403],
  ['PUT',    '/propertyValues/v1',        200, 403],
  ['DELETE', '/propertyValues/v1',        200, 403],
  ['POST',   '/orders',                   200, 200],
  ['GET',    '/orders',                   200, 403],
  ['GET',    '/orders/o1',                200, 403],
  ['PUT',    '/orders/o1',                200, 403],
  ['DELETE', '/orders/o1',                200, 403],
  ['DELETE', '/orders/o1/items/i1',       200, 403],
  ['POST',   '/agent/recommend',          200, 200],
  ['GET',    '/agent/cakes',              200, 200],
  ['GET',    '/agent/health',             200, 200],
  ['POST',   '/agent/report/weekly',      200, 403]
];

test('AC24-AC44: policy | admin | reaches every route in the effective-access table', async () => {
  for (const [method, path, expected] of MATRIX) {
    const response = await call(method, path, adminCookie);
    assert.strictEqual(response.status, expected, `admin ${method} ${path}`);
  }
});

test('AC30-AC44: policy | orderuser | matches the effective-access table exactly', async () => {
  for (const [method, path, , expected] of MATRIX) {
    const response = await call(method, path, orderuserCookie);
    assert.strictEqual(response.status, expected, `orderuser ${method} ${path}`);

    if (expected === 403) {
      assert.deepStrictEqual(await response.json(), { error: 'Access denied: admin only' },
        `orderuser ${method} ${path} body`);
      assert.strictEqual(reached.length, 0, `orderuser ${method} ${path} must not reach the handler`);
    }
  }
});

test('AC45-AC48: policy | no session | every non-public route is 401 and no handler runs', async () => {
  for (const [method, path] of MATRIX) {
    const response = await call(method, path);

    assert.strictEqual(response.status, 401, `anonymous ${method} ${path}`);
    assert.deepStrictEqual(await response.json(), { error: 'Unauthorized: valid session required' });
    assert.strictEqual(reached.length, 0, `anonymous ${method} ${path} must not reach the handler`);
  }
});

// --- the individual middleware rows ---------------------------------------

test('AC24: policy | valid session passes through | req.user carries username and role', async () => {
  const response = await call('GET', '/products', adminCookie);

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual((await response.json()).user, { username: 'admin', role: 'admin' });
});

test('AC45: policy | mounted before the routers | the handler never runs without a session', async () => {
  const response = await call('GET', '/products');

  assert.strictEqual(response.status, 401);
  assert.strictEqual(reached.length, 0, 'the policy must answer before any router');
});

test('AC21: policy | malformed cookie header | 401 rather than a throw', async () => {
  const response = await call('GET', '/products', 'garbage');

  assert.strictEqual(response.status, 401);
  assert.deepStrictEqual(await response.json(), { error: 'Unauthorized: valid session required' });
});

test('AC21: policy | forged token | 401', async () => {
  const response = await call('GET', '/products', 'cake_session=deadbeef');

  assert.strictEqual(response.status, 401);
});

test('AC20: policy | rejected session | the stale cookie is cleared', async () => {
  // /api/auth/me sits behind this middleware, so AC20's "the cookie is cleared"
  // can only happen here — /me's own handler is never reached.
  const response = await call('GET', '/auth/me', 'cake_session=deadbeef');

  assert.strictEqual(response.status, 401);
  assert.ok(/Max-Age=0/i.test(response.headers.get('set-cookie')), 'a rejected session must clear the cookie');
});

test('AC47: policy | 401 precedes 403 | anonymous on an admin-only route gets 401', async () => {
  const response = await call('GET', '/orders');

  assert.strictEqual(response.status, 401, 'authentication is checked before role');
  assert.notStrictEqual(response.status, 403);
});

test('AC33: policy | wrong role | 403 with the admin-only message', async () => {
  const response = await call('GET', '/orders', orderuserCookie);

  assert.strictEqual(response.status, 403);
  assert.deepStrictEqual(await response.json(), { error: 'Access denied: admin only' });
});

test('AC7: policy | login is public | reaches the handler with no session', async () => {
  const response = await call('POST', '/auth/login');

  assert.strictEqual(response.status, 200);
  assert.strictEqual(reached.length, 1, 'login must reach its handler unauthenticated');
});

test('AC18: policy | logout is public | reaches the handler with no session', async () => {
  const response = await call('POST', '/auth/logout');

  assert.strictEqual(response.status, 200);
  assert.strictEqual(reached.length, 1, 'logout must reach its handler unauthenticated');
});

test('Risk: policy | default deny | a route in neither allowlist is admin-only', async () => {
  const invented = await call('GET', '/something/nobody/considered', orderuserCookie);

  assert.strictEqual(invented.status, 403, 'an unlisted route must default to admin-only');

  const asAdmin = await call('GET', '/something/nobody/considered', adminCookie);
  assert.strictEqual(asAdmin.status, 200);
});

test('Risk: policy | default deny | a write to an allowlisted read path is still admin-only', async () => {
  // GET /products is on the both-roles list; POST to the same path must not inherit it.
  assert.strictEqual((await call('POST', '/products', orderuserCookie)).status, 403);
  assert.strictEqual((await call('GET', '/products', orderuserCookie)).status, 200);
});

test('Risk: policy | allowlist patterns are anchored | no prefix or suffix slips through', async () => {
  // /products is both-roles; /products-secret must not be.
  assert.strictEqual((await call('GET', '/products-secret', orderuserCookie)).status, 403);
  assert.strictEqual((await call('GET', '/orders/o1/products', orderuserCookie)).status, 403);
  assert.strictEqual((await call('GET', '/products/p1/properties/extra', orderuserCookie)).status, 403);
});

// --- accessFor, directly --------------------------------------------------

test('policy | accessFor | classifies the three access levels', () => {
  assert.strictEqual(accessFor('POST', '/auth/login'), 'public');
  assert.strictEqual(accessFor('POST', '/auth/logout'), 'public');
  assert.strictEqual(accessFor('GET', '/auth/me'), 'both');
  assert.strictEqual(accessFor('GET', '/products'), 'both');
  assert.strictEqual(accessFor('POST', '/products'), 'admin');
  assert.strictEqual(accessFor('GET', '/auth/login'), 'admin', 'method is part of the match');
  assert.strictEqual(accessFor('DELETE', '/anything/at/all'), 'admin');
});
