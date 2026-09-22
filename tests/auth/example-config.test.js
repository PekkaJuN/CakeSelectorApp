import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadUsers, authenticate } from '../../src/auth/userStore.js';
import { CREDENTIALS } from '../fixtures/users.js';

const EXAMPLE = fileURLToPath(new URL('../../config/users.example.json', import.meta.url));

test('AC1: users.example.json | shape | loads as a valid config with both roles', () => {
  const config = loadUsers(EXAMPLE);

  assert.strictEqual(config.users.length, 2);
  assert.deepStrictEqual(config.users.map(u => u.username), ['admin', 'orderuser']);
  assert.deepStrictEqual(config.users.map(u => u.role), ['admin', 'orderuser']);
  assert.strictEqual(config.sessionTtlHours, 8);
});

test('AC1: users.example.json | ships production hash parameters, not the test cost', () => {
  const config = loadUsers(EXAMPLE);

  // A committed example at the tests' cost of 1024 would quietly weaken every
  // fresh clone that copies it.
  assert.deepStrictEqual(config.hash, {
    algorithm: 'scrypt',
    keyLength: 64,
    cost: 16384,
    blockSize: 8,
    parallelization: 1
  });
});

test('AC58: users.example.json | per-user salts | the two users share neither salt nor hash', () => {
  const [admin, orderuser] = loadUsers(EXAMPLE).users;

  assert.notStrictEqual(admin.salt, orderuser.salt, 'salts must be per-user');
  assert.notStrictEqual(admin.passwordHash, orderuser.passwordHash);
});

test('AC62: users.example.json | no plaintext | no entry carries a password field', () => {
  const raw = JSON.parse(fs.readFileSync(EXAMPLE, 'utf8'));

  for (const user of raw.users) {
    assert.ok(!('password' in user), `user "${user.username}" must not carry a plaintext password`);
  }
});

test('AC1: users.example.json | a fresh clone can log in with the documented throwaway passwords', async () => {
  loadUsers(EXAMPLE);

  assert.deepStrictEqual(
    await authenticate(CREDENTIALS.admin.username, CREDENTIALS.admin.password),
    { username: 'admin', role: 'admin' }
  );
  assert.deepStrictEqual(
    await authenticate(CREDENTIALS.orderuser.username, CREDENTIALS.orderuser.password),
    { username: 'orderuser', role: 'orderuser' }
  );
});

test('Risk: config/users.json | the real credential file is git-ignored', () => {
  const ignore = fs.readFileSync(fileURLToPath(new URL('../../.gitignore', import.meta.url)), 'utf8');
  const rules = ignore.split('\n').map(line => line.trim());

  // The example exists to be copied to config/users.json; if that copy is not
  // ignored, the first commit after setup publishes the hashes.
  assert.ok(
    rules.includes('config/users.json') || rules.includes('/config/users.json'),
    'config/users.json must be listed in .gitignore'
  );
});
