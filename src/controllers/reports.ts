import { Response } from 'express';
import { query } from '../db.js';
import { AuthRequest } from '../types.js';

export const listReports = async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const sql = `
    SELECT 
      r.id, r.nama, r.deskripsi, r.status, r.reporter_id, r.reviewed_by, r.reviewed_at, r.created_at, r.updated_at,
      u.name AS reporter_name,
      rev.name AS reviewer_name
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    LEFT JOIN users rev ON r.reviewed_by = rev.id
    ${user.role === 'pelapor' ? 'WHERE r.reporter_id = $1' : ''}
    ORDER BY r.created_at DESC
  `;

  const params = user.role === 'pelapor' ? [user.id] : [];
  const { rows } = await query(sql, params);

  return res.json({ success: true, data: rows });
};

export const createReport = async (req: AuthRequest, res: Response) => {
  const { nama, deskripsi } = req.body;

  if (!nama || !deskripsi) {
    return res.status(400).json({ success: false, message: 'Nama dan deskripsi laporan wajib diisi' });
  }

  const { rows } = await query(
    'INSERT INTO reports (nama, deskripsi, reporter_id) VALUES ($1, $2, $3) RETURNING *',
    [nama.trim(), deskripsi.trim(), req.user!.id]
  );

  return res.status(201).json({ success: true, data: rows[0], message: 'Laporan berhasil dibuat' });
};

export const updateReport = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { nama, deskripsi } = req.body;

  if (!nama || !deskripsi) {
    return res.status(400).json({ success: false, message: 'Nama dan deskripsi laporan wajib diisi' });
  }

  const existing = await query('SELECT * FROM reports WHERE id = $1', [id]);
  const report = existing.rows[0];

  if (!report) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
  }

  if (req.user!.role === 'pelapor' && report.reporter_id !== req.user!.id) {
    return res.status(403).json({ success: false, message: 'Akses ditolak, ini bukan laporan Anda' });
  }

  if (report.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Hanya laporan berstatus pending yang dapat diedit' });
  }

  const { rows } = await query(
    'UPDATE reports SET nama = $1, deskripsi = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [nama.trim(), deskripsi.trim(), id]
  );

  return res.json({ success: true, data: rows[0], message: 'Laporan berhasil diperbarui' });
};

export const updateReportStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status harus bernilai approved atau rejected' });
  }

  const existing = await query('SELECT id FROM reports WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
  }

  await query(
    'UPDATE reports SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3',
    [status, req.user!.id, id]
  );

  const { rows } = await query(
    `SELECT 
      r.id, r.nama, r.deskripsi, r.status, r.reporter_id, r.reviewed_by, r.reviewed_at, r.created_at, r.updated_at,
      u.name AS reporter_name,
      rev.name AS reviewer_name
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    LEFT JOIN users rev ON r.reviewed_by = rev.id
    WHERE r.id = $1`,
    [id]
  );

  return res.json({ success: true, data: rows[0], message: `Status laporan berhasil diubah menjadi ${status}` });
};
