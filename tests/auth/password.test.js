import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import {
  DEFAULT_HASH_PARAMS,
  generateSalt,
  hashPassword,
  verifyPassword
} from '../../src/auth/password.js';

// Production cost is ~100ms per call by design; the suite would spend minutes on
// it. The parameters are config-driven precisely so tests can turn it down.
const TEST_PARAMS = { ...DEFAULT_HASH_PARAMS, cost: 1024 };

// Arbitrary inputs to a hash function, not anybody's credentials -- these
// are deliberately not the fixture password, because nothing here logs in.
const PASSWORD = 'a-test-password';
const NEAR_MISS = 'a-test-passworb';

test('AC64: DEFAULT_HASH_PARAMS | defaults | scrypt, keyLength 64, cost 16384, blockSize 8, parallelization 1', () => {
  assert.deepStrictEqual({ ...DEFAULT_HASH_PARAMS }, {
    algorithm: 'scrypt',
    keyLength: 64,
    cost: 16384,
    blockSize: 8,
    parallelization: 1
  });
});

test('AC65: generateSalt | shape | returns a 32-character lowercase hex string', () => {
  const salt = generateSalt();

  assert.strictEqual(typeof salt, 'string', 'salt should be a string');
  assert.strictEqual(salt.length, 32, `expected 32 characters, got ${salt.length}`);
  assert.match(salt, /^[0-9a-f]{32}$/, 'salt should be lowercase hex');
});

test('AC58: generateSalt | uniqueness | two calls produce different salts', () => {
  assert.notStrictEqual(generateSalt(), generateSalt());
});

test('AC56: hashPassword | deterministic | same password and salt give the same 128-char hex twice', async () => {
  const salt = generateSalt();

  const first = await hashPassword(PASSWORD, salt, TEST_PARAMS);
  const second = await hashPassword(PASSWORD, salt, TEST_PARAMS);

  assert.strictEqual(first.length, 128, `expected 128 characters, got ${first.length}`);
  assert.match(first, /^[0-9a-f]{128}$/, 'hash should be lowercase hex');
  assert.strictEqual(first, second, 'the same input must hash identically');
});

test('AC58: hashPassword | salt changes the hash | one password under two salts gives two hashes', async () => {
  const first = await hashPassword(PASSWORD, generateSalt(), TEST_PARAMS);
  const second = await hashPassword(PASSWORD, generateSalt(), TEST_PARAMS);

  assert.notStrictEqual(first, second, 'per-user salts must change the hash');
});

test('AC60: hashPassword | keyLength honoured | keyLength 32 gives a 64-character hex string', async () => {
  const hash = await hashPassword(PASSWORD, generateSalt(), { ...TEST_PARAMS, keyLength: 32 });

  assert.strictEqual(hash.length, 64, `expected 64 characters, got ${hash.length}`);
});

test('Risk: hashPassword | non-blocking | four concurrent calls all resolve', async () => {
  const salt = generateSalt();

  const hashes = await Promise.all([
    hashPassword('a-password', salt, TEST_PARAMS),
    hashPassword('b-password', salt, TEST_PARAMS),
    hashPassword('c-password', salt, TEST_PARAMS),
    hashPassword('d-password', salt, TEST_PARAMS)
  ]);

  assert.strictEqual(hashes.length, 4, 'all four calls should resolve');
  assert.strictEqual(new Set(hashes).size, 4, 'four distinct passwords give four distinct hashes');
});

test('Risk: hashPassword | non-blocking | the module calls async scrypt, not scryptSync', () => {
  const source = fs.readFileSync(new URL('../../src/auth/password.js', import.meta.url), 'utf8');

  assert.ok(source.includes('crypto.scrypt('), 'should call the async crypto.scrypt');
  assert.ok(!source.includes('scryptSync'), 'scryptSync would block the single process for ~100ms per login');
});

test('AC56: verifyPassword | match | the password it was built from verifies', async () => {
  const salt = generateSalt();
  const user = { salt, passwordHash: await hashPassword(PASSWORD, salt, TEST_PARAMS) };

  assert.strictEqual(await verifyPassword(PASSWORD, user, TEST_PARAMS), true);
});

test('AC57: verifyPassword | mismatch | a near-miss password does not verify', async () => {
  const salt = generateSalt();
  const user = { salt, passwordHash: await hashPassword(PASSWORD, salt, TEST_PARAMS) };

  assert.strictEqual(await verifyPassword(NEAR_MISS, user, TEST_PARAMS), false);
});

test('AC60: verifyPassword | truncated stored hash | returns false without throwing', async () => {
  const salt = generateSalt();
  const full = await hashPassword(PASSWORD, salt, TEST_PARAMS);
  const user = { salt, passwordHash: full.slice(0, 64) };

  // timingSafeEqual throws on a length mismatch, which would leak the stored hash
  // length through an exception instead of a plain false.
  assert.strictEqual(await verifyPassword(PASSWORD, user, TEST_PARAMS), false);
});
