import { Router } from 'express';
import { db } from '../db.js';
import { signToken, verifyPassword, requireAuth, isSuperAdmin } from '../auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await db.get('SELECT * FROM users WHERE email = ? AND active = 1', [String(email).toLowerCase().trim()]);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user);
    res.cookie('ypp_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure, // HTTPS-only in prod (behind the proxy); off on localhost dev
      maxAge: 12 * 3600 * 1000,
    });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, is_super: isSuperAdmin(user) } });
  } catch (e) { next(e); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('ypp_token', { httpOnly: true, sameSite: 'lax', secure: req.secure });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const u = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: u ? { ...u, is_super: isSuperAdmin(u) } : u });
  } catch (e) { next(e); }
});

export default router;
