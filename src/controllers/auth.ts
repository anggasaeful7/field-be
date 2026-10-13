import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { AuthRequest } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const login = async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
  }

  const { rows } = await query('SELECT id, name, email, password_hash, role, deleted_at FROM users WHERE email = $1', [email]);
  const user = rows[0];

  if (!user || user.deleted_at || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ success: false, message: 'Email atau password salah' });
  }

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  return res.json({ success: true, data: { token, user: payload } });
};

export const me = async (req: AuthRequest, res: Response) => {
  return res.json({ success: true, data: req.user });
};
