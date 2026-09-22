import express from 'express';
import { authenticate } from '../auth/userStore.js';
import { createSession, getSession, destroySession } from '../auth/sessions.js';
import { sessionCookie, clearedCookie, readSessionToken } from '../auth/cookies.js';

const router = express.Router();

export const UNAUTHORIZED = { error: 'Unauthorized: valid session required' };

// One message for a wrong password and for an unknown username: anything more
// specific tells an attacker which usernames exist.
const INVALID_CREDENTIALS = { error: 'Invalid username or password' };

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (typeof password !== 'string' || password === '') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const user = await authenticate(username, password);
  if (!user) {
    return res.status(401).json(INVALID_CREDENTIALS);
  }

  res.setHeader('Set-Cookie', sessionCookie(createSession(user)));
  res.json(user);
});

router.post('/logout', (req, res) => {
  const token = readSessionToken(req);
  if (token) destroySession(token);

  // Idempotent: 200 whether or not a session existed.
  res.setHeader('Set-Cookie', clearedCookie());
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const session = getSession(readSessionToken(req));

  if (!session) {
    res.setHeader('Set-Cookie', clearedCookie());
    return res.status(401).json(UNAUTHORIZED);
  }

  res.json(session);
});

export default router;
