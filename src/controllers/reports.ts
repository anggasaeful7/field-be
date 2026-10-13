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

export const getReportsSummary = async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const filterClause = user.role === 'pelapor' ? 'WHERE reporter_id = $1' : '';
  const params = user.role === 'pelapor' ? [user.id] : [];

  const statsRes = await query(
    `SELECT 
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
    FROM reports
    ${filterClause}`,
    params
  );

  let totalUsers = 0;
  if (user.role === 'admin') {
    const userCount = await query('SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL');
    totalUsers = userCount.rows[0]?.count || 0;
  }

  return res.json({
    success: true,
    data: {
      ...statsRes.rows[0],
      totalUsers
    }
  });
};

export const getReportDetail = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const { rows } = await query(
    `SELECT 
      r.id, r.nama, r.deskripsi, r.status, r.reporter_id, r.reviewed_by, r.reviewed_at, r.created_at, r.updated_at,
      u.name AS reporter_name,
      u.email AS reporter_email,
      rev.name AS reviewer_name
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    LEFT JOIN users rev ON r.reviewed_by = rev.id
    WHERE r.id = $1`,
    [id]
  );

  const report = rows[0];
  if (!report) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
  }

  if (user.role === 'pelapor' && report.reporter_id !== user.id) {
    return res.status(403).json({ success: false, message: 'Akses ditolak, ini bukan laporan Anda' });
  }

  const logsRes = await query(
    `SELECT 
      rl.id, rl.action, rl.notes, rl.created_at,
      u.name AS actor_name,
      u.role AS actor_role
    FROM report_logs rl
    JOIN users u ON rl.actor_id = u.id
    WHERE rl.report_id = $1
    ORDER BY rl.created_at ASC`,
    [id]
  );

  return res.json({
    success: true,
    data: {
      ...report,
      logs: logsRes.rows
    }
  });
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
  const newReport = rows[0];

  await query(
    'INSERT INTO report_logs (report_id, actor_id, action, notes) VALUES ($1, $2, $3, $4)',
    [newReport.id, req.user!.id, 'created', 'Laporan dibuat oleh pelapor']
  );

  return res.status(201).json({ success: true, data: newReport, message: 'Laporan berhasil dibuat' });
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

  await query(
    'INSERT INTO report_logs (report_id, actor_id, action, notes) VALUES ($1, $2, $3, $4)',
    [id, req.user!.id, 'updated', 'Laporan diperbarui oleh pelapor']
  );

  return res.json({ success: true, data: rows[0], message: 'Laporan berhasil diperbarui' });
};

export const updateReportStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, note } = req.body;

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

  const logNote = note?.trim() || (status === 'approved' ? 'Laporan disetujui' : 'Laporan ditolak');
  await query(
    'INSERT INTO report_logs (report_id, actor_id, action, notes) VALUES ($1, $2, $3, $4)',
    [id, req.user!.id, status, logNote]
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
