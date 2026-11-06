import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { q } from './db.js';

const COOKIE = 'unibud_session';
const SESSION_DAYS = 30;
export const DEMO_PASSWORD = 'unibud';

export function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    email: row.email,
    avatarTone: row.avatar_tone,
    headline: row.headline,
  };
}

export async function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      const { rows } = await q(
        `select u.id, u.name, u.handle, u.email, u.avatar_tone, u.headline
           from sessions s
           join users u on u.id = s.user_id
          where s.token = $1 and s.expires_at > now()`,
        [token],
      );
      if (rows[0]) req.user = mapUser(rows[0]);
    } catch (error) {
      return next(error);
    }
  }
  return next();
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue' });
  return next();
}

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Enter your email and password.' });
    }
    const { rows } = await q('select * from users where lower(email) = $1', [email]);
    const user = rows[0];
    const valid = Boolean(user) && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      return res.status(401).json({ error: 'That email and password combination is not recognised.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    await q(
      `insert into sessions (token, user_id, expires_at)
       values ($1, $2, now() + ($3 || ' days')::interval)`,
      [token, user.id, String(SESSION_DAYS)],
    );
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DAYS * 86400000,
    });
    return res.json({ user: mapUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE];
    if (token) await q('delete from sessions where token = $1', [token]);
    res.clearCookie(COOKIE, { path: '/' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get('/me', (req, res) => res.json({ user: req.user ?? null }));

router.get('/demo-accounts', async (_req, res, next) => {
  try {
    const { rows } = await q(
      'select name, handle, email, headline, avatar_tone from users order by name',
    );
    return res.json({
      password: DEMO_PASSWORD,
      accounts: rows.map((row) => ({
        name: row.name,
        handle: row.handle,
        email: row.email,
        headline: row.headline,
        avatarTone: row.avatar_tone,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
