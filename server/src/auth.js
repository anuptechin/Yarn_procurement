import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { db } from './db.js';

export const ROLES = {
  REQUISITIONER: 'requisitioner',
  PROCUREMENT: 'procurement',
  DEPTHEAD: 'depthead',
  ADMIN: 'admin',
};

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
}

// Reads the bearer token (or cookie) and attaches req.user. Does not block.
export function authOptional(req, _res, next) {
  const header = req.headers.authorization;
  let token = null;
  if (header && header.startsWith('Bearer ')) token = header.slice(7);
  else if (req.cookies && req.cookies.ypp_token) token = req.cookies.ypp_token;
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch {
      req.user = null;
    }
  }
  next();
}

// Blocks if not authenticated.
export async function requireAuth(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    // confirm the user still exists & is active
    const row = await db.get('SELECT id, active FROM users WHERE id = ?', [req.user.id]);
    if (!row || !row.active) return res.status(401).json({ error: 'Account inactive' });
    next();
  } catch (e) {
    next(e);
  }
}

// Ensure a Super Admin account exists, using credentials from the environment.
// Idempotent and safe to run on every server start:
//   - no SUPER_ADMIN_EMAIL/PASSWORD set  -> does nothing
//   - account missing                    -> creates it (admin role, active)
//   - account present                    -> re-activates + ensures admin role;
//                                           password only reset when
//                                           SUPER_ADMIN_RESET_PASSWORD=true
export async function ensureSuperAdmin() {
  const { email, password, name, resetPassword } = config.superAdmin;
  if (!email || !password) return; // not configured — skip silently

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (!existing) {
    await db.run(
      `INSERT INTO users (name, email, role, password_hash, active)
       VALUES (?, ?, ?, ?, 1)`,
      [name, email, ROLES.ADMIN, hashPassword(password)]
    );
    console.log(`  → Super Admin created: ${email}`);
    return;
  }

  if (resetPassword) {
    await db.run(
      `UPDATE users SET role = ?, active = 1, password_hash = ? WHERE id = ?`,
      [ROLES.ADMIN, hashPassword(password), existing.id]
    );
    console.log(`  → Super Admin password reset: ${email}`);
  } else {
    await db.run(`UPDATE users SET role = ?, active = 1 WHERE id = ?`, [ROLES.ADMIN, existing.id]);
  }
}

// Blocks if role not allowed. Admin always allowed.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (req.user.role === ROLES.ADMIN || roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'You do not have permission for this action' });
  };
}

// The Super Admin is the single account whose email matches SUPER_ADMIN_EMAIL
// (an admin with elevated, audit-level access). No separate role/column needed.
export function isSuperAdmin(user) {
  return !!user && user.role === ROLES.ADMIN && !!config.superAdmin.email &&
    !!user.email && user.email.toLowerCase() === config.superAdmin.email;
}

// Blocks anyone who is not the Super Admin.
export function requireSuperAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Super Admin access only' });
  next();
}
