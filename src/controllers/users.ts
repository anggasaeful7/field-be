import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { AuthRequest } from '../types.js';

export const listUsers = async (_req: AuthRequest, res: Response) => {
  const { rows } = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
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

  const existing = await query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
  if (existing.rows.length > 0) {
    return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
    [name.trim(), email.trim(), hash, role]
  );

  return res.status(201).json({ success: true, data: rows[0], message: 'Pengguna berhasil dibuat' });
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ success: false, message: 'Nama, email, dan peran wajib diisi' });
  }

  if (!['admin', 'pelapor', 'approver'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Role tidak valid (admin, pelapor, atau approver)' });
  }

  const existing = await query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
  }

  const emailConflict = await query('SELECT id FROM users WHERE email = $1 AND id != $2 AND deleted_at IS NULL', [email, id]);
  if (emailConflict.rows.length > 0) {
    return res.status(400).json({ success: false, message: 'Email sudah digunakan oleh pengguna lain' });
  }

  const { rows } = await query(
    'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, name, email, role, created_at',
    [name.trim(), email.trim(), role, id]
  );

  return res.json({ success: true, data: rows[0], message: 'Data pengguna berhasil diperbarui' });
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'Kata sandi baru dan konfirmasi wajib diisi' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Konfirmasi kata sandi tidak cocok' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter' });
  }

  const existing = await query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);

  return res.json({ success: true, message: 'Kata sandi berhasil diperbarui' });
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (req.user!.id === Number(id)) {
    return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun Anda sendiri' });
  }

  const existing = await query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
  }

  await query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [id]);

  return res.json({ success: true, message: 'Pengguna berhasil dihapus' });
};
