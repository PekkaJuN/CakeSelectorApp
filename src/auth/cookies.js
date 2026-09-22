export const SESSION_COOKIE = 'cake_session';

export function parseCookies(header) {
  const jar = {};
  if (typeof header !== 'string') return jar;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;

    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) jar[name] = decodeURIComponent(value);
  }

  return jar;
}

// Secure only under HTTPS: the app is plain HTTP on localhost, and an
// unconditional Secure flag means the cookie never comes back at all.
function attributes() {
  const parts = ['HttpOnly', 'SameSite=Strict', 'Path=/'];
  if (process.env.HTTPS === 'true') parts.push('Secure');
  return parts;
}

export function sessionCookie(token) {
  return [`${SESSION_COOKIE}=${token}`, ...attributes()].join('; ');
}

export function clearedCookie() {
  return [`${SESSION_COOKIE}=`, ...attributes(), 'Max-Age=0'].join('; ');
}

export function readSessionToken(req) {
  return parseCookies(req.headers?.cookie)[SESSION_COOKIE];
}
