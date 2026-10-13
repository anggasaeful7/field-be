import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { AuthRequest } from '../types.js';

export const listUsers = async (_req: AuthRequest, res: Response) => {
  const { rows } = await query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
  return res.json({ success: true, data: rows });
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Semua kolom wajib diisi' });
  }

  if (!['admin', 'pelapor', 'approver'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Role tidak valid (admin, pelapor, atau approver)' });
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
    [name, email, hash, role]
  );

  return res.status(201).json({ success: true, data: rows[0], message: 'Pengguna berhasil dibuat' });
};
