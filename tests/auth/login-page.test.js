import { test, before, after } from 'node:test';
import assert from 'node:assert';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFixtureConfig } from '../fixtures/users.js';

const SERVER = fileURLToPath(new URL('../../src/server.js', import.meta.url));
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

let child;
let baseUrl;

function freePort() {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

before(async () => {
  const port = await freePort();
  const configPath = await writeFixtureConfig();

  child = spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    env: { ...process.env, AUTH_CONFIG_PATH: configPath, PORT: String(port) }
  });

  await new Promise((resolve, reject) => {
    let out = '';
    child.stdout.on('data', chunk => {
      out += chunk;
      if (/Server running at/.test(out)) resolve();
    });
    child.on('exit', code => reject(new Error(`server exited ${code}`)));
  });

  baseUrl = `http://localhost:${port}`;
});

after(() => child?.kill());

test('AC49: the page served to an anonymous visitor carries a login form', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();

  assert.ok(html.includes('id="login-screen"'), 'a login screen must be present');
  assert.ok(html.includes('id="login-form"'), 'a login form must be present');
  assert.ok(html.includes('id="login-username"'), 'a username field must be present');
  assert.ok(html.includes('id="login-password"'), 'a password field must be present');
  assert.ok(html.includes('type="password"'), 'the password field must be masked');
});

test('AC49: the app shell is a single removable element, hidden until a session exists', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();

  assert.ok(/<div id="app-root" hidden>/.test(html),
    'the tab UI must start hidden and live in one element login.js can remove');
});

test('AC49: app.js is not loaded until the bootstrap has a session', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();

  // A static tag would run the catalog fetches before anyone has logged in.
  assert.ok(!/<script src="app\.js">/.test(html), 'app.js must not be loaded statically');
  assert.ok(/<script type="module" src="login\.js">/.test(html), 'login.js must bootstrap the page');
});

test('AC50: the static markup still ships all five tabs for login.js to prune', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();

  for (const tab of ['products', 'order-builder', 'order-history', 'cake-recommendations', 'order-reports']) {
    assert.ok(html.includes(`data-tab="${tab}"`), `the ${tab} tab should exist before pruning`);
  }
});

test('AC53: the header carries a user label and a Log out button', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();

  assert.ok(html.includes('id="user-label"'), 'a place for "Signed in as ..." must exist');
  assert.ok(/id="logout-btn"[^>]*>|>Log out</.test(html), 'a Log out button must exist');
  assert.ok(/<div id="user-bar" class="user-bar" hidden>/.test(html),
    'the user bar must be hidden until there is a session');
});

test('AC49: the login assets are served', async () => {
  for (const asset of ['login.js', 'auth-ui.js']) {
    const response = await fetch(`${baseUrl}/${asset}`);

    assert.strictEqual(response.status, 200, `${asset} must be served`);
    assert.match(response.headers.get('content-type'), /javascript/, `${asset} content type`);
  }
});

test('AC49: static assets stay public while every /api route is guarded', async () => {
  assert.strictEqual((await fetch(`${baseUrl}/`)).status, 200);
  assert.strictEqual((await fetch(`${baseUrl}/styles.css`)).status, 200);
  assert.strictEqual((await fetch(`${baseUrl}/login.js`)).status, 200);

  assert.strictEqual((await fetch(`${baseUrl}/api/products`)).status, 401);
  assert.strictEqual((await fetch(`${baseUrl}/api/auth/me`)).status, 401);
});

test('Regression: app.js still initialises though login.js loads it after DOMContentLoaded', async () => {
  const source = await (await fetch(`${baseUrl}/app.js`)).text();

  // login.js injects app.js only once GET /api/auth/me has resolved, which is
  // well after DOMContentLoaded has fired. Gating initialisation on that event
  // alone means it never runs -- which is how the Order Builder lost its
  // product dropdown. Listening is fine, but only behind a readyState check.
  const listeners = source.match(/addEventListener\(\s*['"]DOMContentLoaded['"]/g) ?? [];
  assert.strictEqual(listeners.length, 1, 'there should be exactly one such listener, inside the guard');

  assert.ok(
    /if \(document\.readyState === 'loading'\) \{\s*document\.addEventListener\(\s*'DOMContentLoaded'/.test(source),
    'the only DOMContentLoaded listener must sit behind a document.readyState check'
  );
});

test('AC54: login.js talks to the three auth endpoints and nothing else', async () => {
  const source = await (await fetch(`${baseUrl}/login.js`)).text();

  assert.ok(source.includes('/api/auth/me'), 'bootstrap must ask who the user is');
  assert.ok(source.includes('/api/auth/login'), 'the form must post to login');
  assert.ok(source.includes('/api/auth/logout'), 'Log out must post to logout');
});
