import { test, mock } from 'node:test';
import assert from 'node:assert';
import {
  createSession,
  getSession,
  destroySession,
  destroyAllSessions,
  sweepExpired,
  sessionCount,
  startSweep
} from '../../src/auth/sessions.js';
import { loadUsers } from '../../src/auth/userStore.js';
import { writeFixtureConfig } from '../fixtures/users.js';

const ADMIN = { username: 'admin', role: 'admin' };
const HOUR = 60 * 60 * 1000;

// The TTL comes from the loaded config, so every test needs one in place.
async function withLoadedConfig(overrides = {}) {
  loadUsers(await writeFixtureConfig(overrides));
  destroyAllSessions();
}

test('AC7: createSession | issues a token | 64-char hex that resolves to the user', async () => {
  await withLoadedConfig();

  const token = createSession(ADMIN);

  assert.match(token, /^[0-9a-f]{64}$/, `expected 32 random bytes as hex, got: ${token}`);
  assert.deepStrictEqual(getSession(token), { username: 'admin', role: 'admin' });
});

test('AC7: createSession | tokens are unique | two logins get two tokens', async () => {
  await withLoadedConfig();

  assert.notStrictEqual(createSession(ADMIN), createSession(ADMIN));
  assert.strictEqual(sessionCount(), 2);
});

test('AC19: getSession | within TTL | still valid at 7h59m with an 8h TTL', async t => {
  await withLoadedConfig({ sessionTtlHours: 8 });
  t.mock.timers.enable({ apis: ['Date'] });

  const token = createSession(ADMIN);
  t.mock.timers.tick(7 * HOUR + 59 * 60 * 1000);

  assert.deepStrictEqual(getSession(token), { username: 'admin', role: 'admin' });
});

test('AC20: getSession | past TTL | null at 8h01m, and the entry is dropped', async t => {
  await withLoadedConfig({ sessionTtlHours: 8 });
  t.mock.timers.enable({ apis: ['Date'] });

  const token = createSession(ADMIN);
  assert.strictEqual(sessionCount(), 1);

  t.mock.timers.tick(8 * HOUR + 60 * 1000);

  assert.strictEqual(getSession(token), null);
  assert.strictEqual(sessionCount(), 0, 'the expired entry must not linger in the map');
});

test('AC20: expiry is absolute, not sliding | using a session does not extend it', async t => {
  await withLoadedConfig({ sessionTtlHours: 8 });
  t.mock.timers.enable({ apis: ['Date'] });

  const token = createSession(ADMIN);

  t.mock.timers.tick(7 * HOUR);
  assert.ok(getSession(token), 'should still be valid at 7h');

  t.mock.timers.tick(2 * HOUR);
  assert.strictEqual(getSession(token), null, 'dead at T+TTL regardless of use');
});

test('AC21: getSession | unknown token | returns null', async () => {
  await withLoadedConfig();

  assert.strictEqual(getSession('deadbeef'), null);
});

test('AC17: destroySession | removes it | the token stops resolving', async () => {
  await withLoadedConfig();

  const token = createSession(ADMIN);
  destroySession(token);

  assert.strictEqual(getSession(token), null);
  assert.strictEqual(sessionCount(), 0);
});

test('AC18: destroySession | unknown token | does not throw', async () => {
  await withLoadedConfig();

  assert.doesNotThrow(() => destroySession('deadbeef'));
});

test('Sweep: sweepExpired | drops expired entries without anyone reading them', async t => {
  await withLoadedConfig({ sessionTtlHours: 8 });
  t.mock.timers.enable({ apis: ['Date'] });

  createSession(ADMIN);
  createSession({ username: 'orderuser', role: 'orderuser' });
  assert.strictEqual(sessionCount(), 2);

  t.mock.timers.tick(9 * HOUR);
  const removed = sweepExpired();

  assert.strictEqual(removed, 2, 'both expired entries should be reported');
  assert.strictEqual(sessionCount(), 0);
});

test('Sweep: sweepExpired | leaves live entries alone', async t => {
  await withLoadedConfig({ sessionTtlHours: 8 });
  t.mock.timers.enable({ apis: ['Date'] });

  const live = createSession(ADMIN);
  t.mock.timers.tick(1 * HOUR);

  assert.strictEqual(sweepExpired(), 0);
  assert.ok(getSession(live), 'a live session must survive the sweep');
});

test('Sweep: startSweep | returns a timer that does not hold the process open', async () => {
  await withLoadedConfig();

  const timer = startSweep(1000);

  // clearInterval must run even when the assertion fails: a still-referenced
  // interval would keep this process alive until the runner is killed.
  try {
    assert.ok(timer, 'startSweep should return a handle so it can be stopped');
    assert.ok(timer.hasRef && timer.hasRef() === false, 'the sweep timer must be unref\'d');
  } finally {
    clearInterval(timer);
  }
});

test('AC20: getSession | exact TTL boundary | dead at T+TTL, not one tick later', async t => {
  await withLoadedConfig({ sessionTtlHours: 8 });
  t.mock.timers.enable({ apis: ['Date'] });

  const token = createSession(ADMIN);
  t.mock.timers.tick(8 * HOUR);

  // "issued at T, dead at T + TTL" — the boundary itself is expired.
  assert.strictEqual(getSession(token), null);
  assert.strictEqual(sessionCount(), 0);
});
