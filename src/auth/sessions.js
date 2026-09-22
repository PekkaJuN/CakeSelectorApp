import crypto from 'node:crypto';
import { getConfig } from './userStore.js';

const TOKEN_BYTES = 32;
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

// In memory on purpose: restarting the server logs everyone out, and `npm run
// dev` restarts on every file save, so this is a daily event rather than an edge
// case. The login form is two fields.
const sessions = new Map();

export function createSession(user) {
  const { sessionTtlHours } = getConfig();
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');

  sessions.set(token, {
    username: user.username,
    role: user.role,
    // Absolute, not sliding: issued at T, dead at T + TTL however much it is used.
    expiresAt: Date.now() + sessionTtlHours * MS_PER_HOUR
  });

  return token;
}

export function getSession(token) {
  const session = sessions.get(token);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return { username: session.username, role: session.role };
}

export function destroySession(token) {
  return sessions.delete(token);
}

export function destroyAllSessions() {
  sessions.clear();
}

// getSession drops an expired entry when someone asks for it; this drops the ones
// nobody ever comes back for.
export function sweepExpired(now = Date.now()) {
  let removed = 0;

  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) {
      sessions.delete(token);
      removed += 1;
    }
  }

  return removed;
}

export function sessionCount() {
  return sessions.size;
}

export function startSweep(intervalMs = SWEEP_INTERVAL_MS) {
  const timer = setInterval(() => sweepExpired(), intervalMs);
  // A housekeeping timer must never be the reason the process stays alive.
  timer.unref();
  return timer;
}
