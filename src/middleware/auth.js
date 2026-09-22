import { getSession } from '../auth/sessions.js';
import { readSessionToken, clearedCookie } from '../auth/cookies.js';

export const UNAUTHORIZED = { error: 'Unauthorized: valid session required' };
export const FORBIDDEN = { error: 'Access denied: admin only' };

// One table, first match wins, paths relative to the /api mount point. Anything
// not listed here is admin-only: a route added later without a thought for auth
// fails closed, which is the only direction that cannot hurt.
const PUBLIC = [
  ['POST', /^\/auth\/(login|logout)$/]
];

const BOTH_ROLES = [
  ['GET', /^\/auth\/me$/],
  ['GET', /^\/products$/],
  ['GET', /^\/products\/[^/]+\/properties$/],
  ['GET', /^\/properties\/[^/]+\/values$/],
  ['POST', /^\/orders$/],
  ['POST', /^\/agent\/recommend$/],
  ['GET', /^\/agent\/(cakes|health)$/]
];

function matches(rules, method, path) {
  return rules.some(([verb, pattern]) => verb === method && pattern.test(path));
}

export function accessFor(method, path) {
  if (matches(PUBLIC, method, path)) return 'public';
  if (matches(BOTH_ROLES, method, path)) return 'both';
  return 'admin';
}

export function authPolicy(req, res, next) {
  const access = accessFor(req.method, req.path);
  if (access === 'public') return next();

  const session = getSession(readSessionToken(req));

  // Authentication before role, so an anonymous caller to an admin endpoint gets
  // 401 and never 403.
  if (!session) {
    // GET /api/auth/me is behind this middleware, so clearing the stale cookie
    // has to happen here — the route's own handler is never reached.
    res.setHeader('Set-Cookie', clearedCookie());
    return res.status(401).json(UNAUTHORIZED);
  }

  req.user = session;

  if (access === 'both' || session.role === 'admin') return next();

  return res.status(403).json(FORBIDDEN);
}

export default authPolicy;
