import { test } from 'node:test';
import assert from 'node:assert';
import { loadUsers, authenticate, findUser } from '../../src/auth/userStore.js';
import { CREDENTIALS, fixtureConfig, writeConfig, writeFixtureConfig } from '../fixtures/users.js';

async function configWith(mutate) {
  const config = await fixtureConfig();
  mutate(config);
  return writeConfig(config);
}

// --- loadUsers: shape and validation -------------------------------------

test('AC1: loadUsers | happy path | returns both fixture users with their roles', async () => {
  const config = loadUsers(await writeFixtureConfig());

  assert.strictEqual(config.users.length, 2);
  assert.deepStrictEqual(config.users.map(u => u.role), ['admin', 'orderuser']);
  assert.deepStrictEqual(config.users.map(u => u.username), ['admin', 'orderuser']);
});

test('AC2: loadUsers | file missing | throws naming the path', async () => {
  const missing = (await writeFixtureConfig()).replace('users.json', 'absent.json');

  assert.throws(() => loadUsers(missing), { message: `Auth config not found at ${missing}` });
});

test('AC2: loadUsers | malformed JSON | throws with the parse error and the path', () => {
  const file = writeConfig('{');

  assert.throws(() => loadUsers(file), error => {
    assert.ok(error.message.includes(file), `message should name the path, got: ${error.message}`);
    assert.ok(/JSON|token|parse/i.test(error.message), `message should carry the parse error, got: ${error.message}`);
    return true;
  });
});

test('AC3: loadUsers | bad role | throws naming the role and the user', async () => {
  const file = await configWith(c => { c.users[0].role = 'superuser'; });

  assert.throws(() => loadUsers(file), {
    message: 'Invalid role "superuser" for user "admin": must be "admin" or "orderuser"'
  });
});

test('AC4: loadUsers | duplicate username | throws naming the username', async () => {
  const file = await configWith(c => { c.users[1].username = 'admin'; });

  assert.throws(() => loadUsers(file), { message: 'Duplicate username in auth config: admin' });
});

test('AC5: loadUsers | empty list | throws that there are no users', async () => {
  const file = await configWith(c => { c.users = []; });

  assert.throws(() => loadUsers(file), { message: 'Auth config contains no users' });
});

test('AC5: loadUsers | blank username | throws naming the entry', async () => {
  const file = await configWith(c => { c.users[1].username = '  '; });

  assert.throws(() => loadUsers(file), error => {
    assert.ok(/blank username/i.test(error.message), `got: ${error.message}`);
    assert.ok(/1/.test(error.message), `message should identify the entry, got: ${error.message}`);
    return true;
  });
});

test('AC59: loadUsers | non-hex salt | throws that the salt must be hex', async () => {
  const file = await configWith(c => { c.users[0].salt = 'not-hex!!'; });

  assert.throws(() => loadUsers(file), {
    message: 'Invalid salt for user "admin": must be hex'
  });
});

test('AC60: loadUsers | short hash | throws naming the expected and actual length', async () => {
  const file = await configWith(c => { c.users[0].passwordHash = c.users[0].passwordHash.slice(0, 64); });

  assert.throws(() => loadUsers(file), {
    message: 'Invalid passwordHash for user "admin": expected 128 hex characters, got 64'
  });
});

test('AC61: loadUsers | missing salt | throws naming the user', async () => {
  const file = await configWith(c => { delete c.users[0].salt; });

  assert.throws(() => loadUsers(file), { message: 'Missing salt for user "admin"' });
});

test('AC62: loadUsers | leftover plaintext | throws pointing at the hash tool', async () => {
  const file = await configWith(c => { c.users[0].password = 'left-in-by-mistake'; });

  assert.throws(() => loadUsers(file), {
    message: 'User "admin" has a plaintext "password" field; hash it with npm run auth:hash'
  });
});

test('AC63: loadUsers | unsupported algorithm | throws naming the algorithm', async () => {
  const file = await configWith(c => { c.hash.algorithm = 'md5'; });

  assert.throws(() => loadUsers(file), {
    message: 'Unsupported hash algorithm "md5": only "scrypt" is supported'
  });
});

test('AC64: loadUsers | no hash block | applies the documented defaults', async () => {
  const file = await configWith(c => { delete c.hash; });

  assert.deepStrictEqual(loadUsers(file).hash, {
    algorithm: 'scrypt',
    keyLength: 64,
    cost: 16384,
    blockSize: 8,
    parallelization: 1
  });
});

test('AC19: loadUsers | no sessionTtlHours | defaults to 8', async () => {
  const file = await configWith(c => { delete c.sessionTtlHours; });

  assert.strictEqual(loadUsers(file).sessionTtlHours, 8);
});

// --- authenticate ---------------------------------------------------------

test('AC56: authenticate | correct credentials | returns the username and role', async () => {
  loadUsers(await writeFixtureConfig());

  assert.deepStrictEqual(
    await authenticate('admin', CREDENTIALS.admin.password),
    { username: 'admin', role: 'admin' }
  );
});

test('AC9: authenticate | username is case-insensitive | ADMIN resolves to admin', async () => {
  loadUsers(await writeFixtureConfig());

  assert.deepStrictEqual(
    await authenticate('ADMIN', CREDENTIALS.admin.password),
    { username: 'admin', role: 'admin' }
  );
});

test('AC10: authenticate | password is case-sensitive | ADMIN123 is rejected', async () => {
  loadUsers(await writeFixtureConfig());

  assert.strictEqual(await authenticate('admin', 'ADMIN123'), null);
});

test('AC57: authenticate | near-miss password | returns null', async () => {
  loadUsers(await writeFixtureConfig());

  assert.strictEqual(await authenticate('admin', 'admin124'), null);
});

test('AC10: authenticate | wrong password | returns null', async () => {
  loadUsers(await writeFixtureConfig());

  assert.strictEqual(await authenticate('admin', 'wrong'), null);
});

test('AC11: authenticate | unknown username | returns null', async () => {
  loadUsers(await writeFixtureConfig());

  assert.strictEqual(await authenticate('nobody', 'x'), null);
});

test('AC11: authenticate | unknown username still hashes | the burn helper runs exactly once', async () => {
  loadUsers(await writeFixtureConfig());

  let burned = 0;
  const result = await authenticate('nobody', 'x', {
    burn: async () => { burned += 1; }
  });

  // An early return would make an unknown username answer faster than a real one,
  // which is exactly what the shared error message is there to hide.
  assert.strictEqual(result, null);
  assert.strictEqual(burned, 1, 'the hash helper must run for unknown usernames too');
});

test('AC8: findUser | orderuser | resolves case-insensitively to the stored entry', async () => {
  loadUsers(await writeFixtureConfig());

  assert.strictEqual(findUser('OrderUser').role, 'orderuser');
  assert.strictEqual(findUser('nobody'), undefined);
});
