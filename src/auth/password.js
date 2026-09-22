import crypto from 'node:crypto';

export const DEFAULT_HASH_PARAMS = Object.freeze({
  algorithm: 'scrypt',
  keyLength: 64,
  cost: 16384,
  blockSize: 8,
  parallelization: 1
});

const SALT_BYTES = 16;
const HEX_PATTERN = /^[0-9a-f]+$/i;

export function isHex(value) {
  return typeof value === 'string' && value.length > 0 && HEX_PATTERN.test(value);
}

export function generateSalt() {
  return crypto.randomBytes(SALT_BYTES).toString('hex');
}

export function hashPassword(password, salt, params = DEFAULT_HASH_PARAMS) {
  return new Promise((resolve, reject) => {
    // scrypt needs 128 * N * r bytes; Node's 32MB default is under that once cost
    // climbs, so the budget is derived from the parameters rather than assumed.
    const maxmem = 256 * params.cost * params.blockSize;

    crypto.scrypt(
      password,
      Buffer.from(salt, 'hex'),
      params.keyLength,
      { N: params.cost, r: params.blockSize, p: params.parallelization, maxmem },
      (error, derivedKey) => {
        if (error) return reject(error);
        resolve(derivedKey.toString('hex'));
      }
    );
  });
}

export async function verifyPassword(submitted, user, params = DEFAULT_HASH_PARAMS) {
  const derived = await hashPassword(submitted, user.salt, params);
  const derivedBuffer = Buffer.from(derived, 'hex');
  const storedBuffer = Buffer.from(user.passwordHash, 'hex');

  // timingSafeEqual throws on length mismatch, which would leak the stored hash
  // length through an exception instead of returning a plain false.
  if (derivedBuffer.length !== storedBuffer.length) return false;

  return crypto.timingSafeEqual(derivedBuffer, storedBuffer);
}

const DUMMY_SALT = generateSalt();

// Burn the same work for an unknown username as for a real one. Without this the
// response time tells an attacker which usernames exist, which is exactly what the
// shared "Invalid username or password" message is there to hide.
export async function burnHashCycle(submitted, params = DEFAULT_HASH_PARAMS) {
  await hashPassword(submitted, DUMMY_SALT, params);
}
