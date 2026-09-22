import fs from 'node:fs';
import {
  DEFAULT_HASH_PARAMS,
  isHex,
  verifyPassword,
  burnHashCycle
} from './password.js';

const ROLES = ['admin', 'orderuser'];
const DEFAULT_SESSION_TTL_HOURS = 8;

let loaded = null;

function readConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Auth config not found at ${configPath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    throw new Error(`Auth config at ${configPath} is not valid JSON: ${error.message}`);
  }
}

function validateUser(user, index, expectedHashChars, seen) {
  const username = typeof user.username === 'string' ? user.username.trim() : '';
  if (!username) {
    throw new Error(`Auth config user at index ${index} has a blank username`);
  }

  // Logins are case-insensitive, so two entries differing only in case would be
  // the same account with two passwords.
  const key = username.toLowerCase();
  if (seen.has(key)) {
    throw new Error(`Duplicate username in auth config: ${key}`);
  }
  seen.add(key);

  if (!ROLES.includes(user.role)) {
    throw new Error(
      `Invalid role "${user.role}" for user "${username}": must be "admin" or "orderuser"`
    );
  }

  if ('password' in user) {
    throw new Error(
      `User "${username}" has a plaintext "password" field; hash it with npm run auth:hash`
    );
  }

  if (!user.salt) {
    throw new Error(`Missing salt for user "${username}"`);
  }

  if (!isHex(user.salt)) {
    throw new Error(`Invalid salt for user "${username}": must be hex`);
  }

  if (!user.passwordHash) {
    throw new Error(`Missing passwordHash for user "${username}"`);
  }

  if (!isHex(user.passwordHash) || user.passwordHash.length !== expectedHashChars) {
    throw new Error(
      `Invalid passwordHash for user "${username}": ` +
      `expected ${expectedHashChars} hex characters, got ${user.passwordHash.length}`
    );
  }

  return { username, role: user.role, salt: user.salt, passwordHash: user.passwordHash };
}

export function loadUsers(configPath) {
  const raw = readConfig(configPath);

  // Parameters live in the file so they can be raised later without invalidating
  // hashes already generated under the old ones.
  const hash = { ...DEFAULT_HASH_PARAMS, ...(raw.hash ?? {}) };
  if (hash.algorithm !== 'scrypt') {
    throw new Error(`Unsupported hash algorithm "${hash.algorithm}": only "scrypt" is supported`);
  }

  if (!Array.isArray(raw.users) || raw.users.length === 0) {
    throw new Error('Auth config contains no users');
  }

  const seen = new Set();
  const expectedHashChars = hash.keyLength * 2;
  const users = raw.users.map((user, index) => validateUser(user, index, expectedHashChars, seen));

  loaded = {
    users,
    hash,
    sessionTtlHours: raw.sessionTtlHours ?? DEFAULT_SESSION_TTL_HOURS
  };

  return loaded;
}

export function getConfig() {
  if (!loaded) throw new Error('Auth config has not been loaded');
  return loaded;
}

export function findUser(username) {
  if (!loaded || typeof username !== 'string') return undefined;

  const key = username.trim().toLowerCase();
  return loaded.users.find(user => user.username.toLowerCase() === key);
}

// deps exists so the AC11 test can watch the burn helper run; production callers
// pass two arguments and get the real thing.
export async function authenticate(username, password, deps = {}) {
  const { verify = verifyPassword, burn = burnHashCycle } = deps;
  const { hash } = getConfig();

  const user = findUser(username);

  if (!user) {
    // Burn the same work as a real lookup: response latency must not reveal
    // which usernames exist.
    await burn(typeof password === 'string' ? password : '', hash);
    return null;
  }

  const matches = await verify(password, user, hash);
  return matches ? { username: user.username, role: user.role } : null;
}
