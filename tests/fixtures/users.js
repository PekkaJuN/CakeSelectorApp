import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_HASH_PARAMS, generateSalt, hashPassword } from '../../src/auth/password.js';

// Production strength is ~100ms per hash by design; at that cost the suite would
// spend minutes hashing. The parameters are config-driven precisely so tests can
// turn the cost down, and the hashes below are generated rather than pasted so
// they cannot drift from the passwords the tests type.
export const TEST_HASH_PARAMS = Object.freeze({ ...DEFAULT_HASH_PARAMS, cost: 1024 });

export const CREDENTIALS = Object.freeze({
  admin: { username: 'admin', role: 'admin', password: 'admin123' },
  orderuser: { username: 'orderuser', role: 'orderuser', password: 'order123' }
});

export async function buildUser({ username, role, password }, params = TEST_HASH_PARAMS) {
  const salt = generateSalt();
  return { username, role, salt, passwordHash: await hashPassword(password, salt, params) };
}

export async function fixtureConfig(overrides = {}) {
  const users = await Promise.all([
    buildUser(CREDENTIALS.admin),
    buildUser(CREDENTIALS.orderuser)
  ]);

  return { sessionTtlHours: 8, hash: { ...TEST_HASH_PARAMS }, users, ...overrides };
}

// Each config lands in its own temp directory so a fixture can never be mistaken
// for, or clobber, the real config/users.json.
export function writeConfig(config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cake-auth-'));
  const file = path.join(dir, 'users.json');
  fs.writeFileSync(file, typeof config === 'string' ? config : JSON.stringify(config, null, 2));
  return file;
}

export async function writeFixtureConfig(overrides = {}) {
  return writeConfig(await fixtureConfig(overrides));
}
