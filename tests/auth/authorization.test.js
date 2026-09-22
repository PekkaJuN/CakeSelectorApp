import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CREDENTIALS, writeFixtureConfig } from '../fixtures/users.js';

// The policy table is unit-tested against stub handlers in policy.test.js. This
// file runs the same rules through the real routers and the real database, so a
// refusal is shown to leave the data untouched rather than merely return 403.

const SERVER = fileURLToPath(new URL('../../src/server.js', import.meta.url));
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

let child;
let base;
let admin;
let orderuser;
let agentStub;
let agentCalls = [];

function freePort() {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Stands in for the two Python agent services, so the agent rows can assert
// "the stub received the call" instead of inspecting a connection error.
function startAgentStub(port) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      agentCalls.push(`${req.method} ${req.url}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, answer: 'stub', analysis: {}, cakes: [] }));
    });
    server.listen(port, () => resolve(server));
  });
}

function call(method, path, { cookie, body } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

async function login(username, password) {
  const response = await call('POST', '/api/auth/login', { body: { username, password } });
  assert.strictEqual(response.status, 200, `could not log in as ${username}`);
  return response.headers.get('set-cookie').split(';')[0];
}

const asAdmin = (method, path, body) => call(method, path, { cookie: admin, body });
const asOrderuser = (method, path, body) => call(method, path, { cookie: orderuser, body });
const anonymously = (method, path, body) => call(method, path, { body });

async function productCount() {
  return (await (await asAdmin('GET', '/api/products')).json()).length;
}

async function orderCount() {
  return (await (await asAdmin('GET', '/api/orders')).json()).length;
}

async function createProduct(name) {
  const response = await asAdmin('POST', '/api/products', { name });
  assert.strictEqual(response.status, 201, `seeding "${name}" failed`);
  return (await response.json()).id;
}

before(async () => {
  const agentPort = await freePort();
  agentStub = await startAgentStub(agentPort);

  const port = await freePort();
  const configPath = await writeFixtureConfig();

  child = spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    env: {
      ...process.env,
      AUTH_CONFIG_PATH: configPath,
      PORT: String(port),
      ORDER_REPORTER_API_URL: `http://127.0.0.1:${agentPort}`,
      CAKE_RECOMMENDER_API_URL: `http://127.0.0.1:${agentPort}`
    }
  });

  await new Promise((resolve, reject) => {
    let out = '';
    child.stdout.on('data', chunk => {
      out += chunk;
      if (/Server running at/.test(out)) resolve();
    });
    child.on('exit', code => reject(new Error(`server exited ${code}`)));
  });

  base = `http://localhost:${port}`;
  admin = await login(CREDENTIALS.admin.username, CREDENTIALS.admin.password);
  orderuser = await login(CREDENTIALS.orderuser.username, CREDENTIALS.orderuser.password);
});

after(async () => {
  child?.kill();
  await new Promise(resolve => agentStub?.close(resolve));
});

// --- Products and properties ---------------------------------------------

test('AC24/AC30/AC45: GET /api/products | admin and orderuser read it, anonymous cannot', async () => {
  assert.strictEqual((await asAdmin('GET', '/api/products')).status, 200);
  assert.strictEqual((await asOrderuser('GET', '/api/products')).status, 200);
  assert.strictEqual((await anonymously('GET', '/api/products')).status, 401);
});

test('AC25: POST/DELETE /api/products | admin creates and deletes', async () => {
  const created = await asAdmin('POST', '/api/products', { name: 'ZZ admin cake' });
  assert.strictEqual(created.status, 201);

  const { id } = await created.json();
  assert.strictEqual((await asAdmin('DELETE', `/api/products/${id}`)).status, 200);
});

test('AC33: POST /api/products | orderuser is refused and the catalog is unchanged', async () => {
  const before = await productCount();

  const response = await asOrderuser('POST', '/api/products', { name: 'ZZ sneaky cake' });

  assert.strictEqual(response.status, 403);
  assert.deepStrictEqual(await response.json(), { error: 'Access denied: admin only' });
  assert.strictEqual(await productCount(), before, 'a refused write must not reach the database');
});

test('AC45: POST /api/products | anonymous is refused and the catalog is unchanged', async () => {
  const before = await productCount();

  assert.strictEqual((await anonymously('POST', '/api/products', { name: 'ZZ anon cake' })).status, 401);
  assert.strictEqual(await productCount(), before);
});

test('AC34: PUT /api/products/:id | orderuser cannot rename, and the name survives', async () => {
  const id = await createProduct('ZZ rename target');

  try {
    const response = await asOrderuser('PUT', `/api/products/${id}`, { name: 'Renamed' });
    assert.strictEqual(response.status, 403);

    const products = await (await asAdmin('GET', '/api/products')).json();
    assert.strictEqual(products.find(p => p.id === id).name, 'ZZ rename target');
  } finally {
    await asAdmin('DELETE', `/api/products/${id}`);
  }
});

test('AC35: DELETE /api/products/:id | orderuser cannot delete, and the product survives', async () => {
  const id = await createProduct('ZZ delete target');

  try {
    assert.strictEqual((await asOrderuser('DELETE', `/api/products/${id}`)).status, 403);

    const products = await (await asAdmin('GET', '/api/products')).json();
    assert.ok(products.some(p => p.id === id), 'the product must still be there');
  } finally {
    await asAdmin('DELETE', `/api/products/${id}`);
  }
});

test('AC31/AC32/AC36: properties and values | orderuser reads them but changes nothing', async () => {
  const productId = await createProduct('ZZ property host');

  try {
    const property = await (await asAdmin('POST', `/api/products/${productId}/properties`, { name: 'Base' })).json();
    const value = await (await asAdmin('POST', `/api/properties/${property.id}/values`, { value: 'light' })).json();

    // AC31 / AC32 — reads an order taker genuinely needs
    assert.strictEqual((await asOrderuser('GET', `/api/products/${productId}/properties`)).status, 200);
    assert.strictEqual((await asOrderuser('GET', `/api/properties/${property.id}/values`)).status, 200);

    // AC36 — every write refused, and nothing changes
    assert.strictEqual((await asOrderuser('POST', `/api/products/${productId}/properties`, { name: 'Size' })).status, 403);
    assert.strictEqual((await asOrderuser('POST', `/api/properties/${property.id}/values`, { value: 'large' })).status, 403);
    assert.strictEqual((await asOrderuser('PUT', `/api/propertyValues/${value.id}`, { value: 'x' })).status, 403);
    assert.strictEqual((await asOrderuser('DELETE', `/api/properties/${property.id}`)).status, 403);

    const properties = await (await asAdmin('GET', `/api/products/${productId}/properties`)).json();
    assert.strictEqual(properties.length, 1, 'no property may have been added or removed');

    const values = await (await asAdmin('GET', `/api/properties/${property.id}/values`)).json();
    assert.strictEqual(values.length, 1, 'no value may have been added');
    assert.strictEqual(values[0].value, 'light', 'the value text must be unchanged');
  } finally {
    await asAdmin('DELETE', `/api/products/${productId}`);
  }
});

// --- Orders ---------------------------------------------------------------

test('AC37/AC29: POST /api/orders | both roles can save an order, and it persists', async () => {
  const productId = await createProduct('ZZ order product');

  try {
    for (const [label, send] of [['orderuser', asOrderuser], ['admin', asAdmin]]) {
      const response = await send('POST', '/api/orders', {
        customerName: `ZZ ${label}`,
        items: [{ productId, selections: {} }]
      });

      assert.strictEqual(response.status, 201, `${label} should be able to save an order`);

      const { id } = await response.json();
      const stored = await (await asAdmin('GET', `/api/orders/${id}`)).json();
      assert.strictEqual(stored.customerName, `ZZ ${label}`, 'the order must really be stored');

      await asAdmin('DELETE', `/api/orders/${id}`);
    }
  } finally {
    await asAdmin('DELETE', `/api/products/${productId}`);
  }
});

test('AC46: POST /api/orders | anonymous is refused and no order appears', async () => {
  const productId = await createProduct('ZZ anon order product');

  try {
    const before = await orderCount();

    const response = await anonymously('POST', '/api/orders', {
      customerName: 'ZZ anon',
      items: [{ productId, selections: {} }]
    });

    assert.strictEqual(response.status, 401);
    assert.strictEqual(await orderCount(), before, 'no order may be created without a session');
  } finally {
    await asAdmin('DELETE', `/api/products/${productId}`);
  }
});

test('AC26/AC38/AC39: reading orders | admin sees them, orderuser is refused and learns nothing', async () => {
  const productId = await createProduct('ZZ history product');

  try {
    const { id } = await (await asAdmin('POST', '/api/orders', {
      customerName: 'ZZ Ada',
      items: [{ productId, selections: {} }]
    })).json();

    // AC26 — admin reads the list and the detail
    const list = await asAdmin('GET', '/api/orders');
    assert.strictEqual(list.status, 200);
    assert.ok((await list.json()).some(o => o.id === id), 'the saved order should be listed');
    assert.strictEqual((await asAdmin('GET', `/api/orders/${id}`)).status, 200);

    // AC38 — no list for an order taker
    const refusedList = await asOrderuser('GET', '/api/orders');
    assert.strictEqual(refusedList.status, 403);
    assert.deepStrictEqual(await refusedList.json(), { error: 'Access denied: admin only' });

    // AC39 — and no detail either; the body must not leak the order
    const refusedDetail = await asOrderuser('GET', `/api/orders/${id}`);
    assert.strictEqual(refusedDetail.status, 403);
    assert.ok(!(await refusedDetail.text()).includes('ZZ Ada'), 'the denial must not carry order fields');

    await asAdmin('DELETE', `/api/orders/${id}`);
  } finally {
    await asAdmin('DELETE', `/api/products/${productId}`);
  }
});

test('AC40/AC41: changing orders | orderuser is refused and the order survives intact', async () => {
  const productId = await createProduct('ZZ mutate product');

  try {
    const { id } = await (await asAdmin('POST', '/api/orders', {
      customerName: 'ZZ Original',
      items: [{ productId, selections: {} }]
    })).json();

    const before = await (await asAdmin('GET', `/api/orders/${id}`)).json();
    const itemId = before.items[0].id;

    assert.strictEqual((await asOrderuser('PUT', `/api/orders/${id}`, { customerName: 'Grace' })).status, 403);
    assert.strictEqual((await asOrderuser('DELETE', `/api/orders/${id}`)).status, 403);
    assert.strictEqual((await asOrderuser('DELETE', `/api/orders/${id}/items/${itemId}`)).status, 403);

    const after = await (await asAdmin('GET', `/api/orders/${id}`)).json();
    assert.strictEqual(after.customerName, 'ZZ Original', 'the customer name must be unchanged');
    assert.strictEqual(after.items.length, before.items.length, 'the item must still be there');

    await asAdmin('DELETE', `/api/orders/${id}`);
  } finally {
    await asAdmin('DELETE', `/api/products/${productId}`);
  }
});

// --- Agent endpoints ------------------------------------------------------

test('AC42/AC28: POST /api/agent/recommend | both roles reach the agent', async () => {
  for (const [label, send] of [['orderuser', asOrderuser], ['admin', asAdmin]]) {
    agentCalls = [];

    const response = await send('POST', '/api/agent/recommend', { dietary_restriction: 'vegan', serves: 8 });

    assert.notStrictEqual(response.status, 403, `${label} must not be refused the recommender`);
    assert.notStrictEqual(response.status, 401);
    assert.ok(agentCalls.some(c => c.includes('/recommend')), `the stub should have heard from ${label}`);
  }
});

test('AC43: GET /api/agent/cakes and /health | an orderuser reaches both', async () => {
  for (const path of ['/api/agent/cakes', '/api/agent/health']) {
    agentCalls = [];

    const response = await asOrderuser('GET', path);

    assert.notStrictEqual(response.status, 403, `${path} must be open to an orderuser`);
    assert.notStrictEqual(response.status, 401);
    assert.ok(agentCalls.length > 0, `the stub should have been called for ${path}`);
  }
});

test('AC27/AC44: POST /api/agent/report/weekly | admin only, and a refusal reaches no agent', async () => {
  agentCalls = [];
  const allowed = await asAdmin('POST', '/api/agent/report/weekly', { reference_date: '2026-09-21' });
  assert.notStrictEqual(allowed.status, 403, 'an admin may run the weekly report');
  assert.ok(agentCalls.some(c => c.includes('/report')), 'the stub should have run the report');

  agentCalls = [];
  const refused = await asOrderuser('POST', '/api/agent/report/weekly', { reference_date: '2026-09-21' });
  assert.strictEqual(refused.status, 403);
  assert.deepStrictEqual(await refused.json(), { error: 'Access denied: admin only' });
  assert.strictEqual(agentCalls.length, 0, 'a refused report must never reach the agent');
});

test('AC47/AC48: agent endpoints | anonymous gets 401, never 403, and the agent hears nothing', async () => {
  for (const [method, path] of [
    ['POST', '/api/agent/recommend'],
    ['GET', '/api/agent/cakes'],
    ['GET', '/api/agent/health'],
    ['POST', '/api/agent/report/weekly']
  ]) {
    agentCalls = [];

    const response = await anonymously(method, path, method === 'POST' ? {} : undefined);

    assert.strictEqual(response.status, 401, `${method} ${path} should be 401`);
    assert.strictEqual(agentCalls.length, 0, `${method} ${path} must not reach the agent`);
  }
});
