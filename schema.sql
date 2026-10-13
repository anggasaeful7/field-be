-- Database Schema: Field Report Management System (MAPID Case Study)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'pelapor', 'approver')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(200) NOT NULL,
    deskripsi TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Seed Data: Demo Accounts (password: admin123, pelapor123, approver123)
INSERT INTO users (name, email, password_hash, role)
VALUES
    ('Administrator', 'admin@example.dev', '$2b$10$v5gnX9RJlYgAKU7QXhkfFunqlzpZ3RYmNl0pnq5Vm9EvZ6LEmekum', 'admin'),
    ('Budi Pelapor', 'pelapor@example.dev', '$2b$10$mh5bcJct5LS.6n84pAq/4.1feeGy5VuPgF.qvTKl3H58RlOuCJho2', 'pelapor'),
    ('Siti Approver', 'approver@example.dev', '$2b$10$sc1pfyQ/6gDect7O5/ILQeKUgN1S76tiXEqGXR37fosVxGPCEYMLW', 'approver')
ON CONFLICT (email) DO NOTHING;

-- Seed Data: Sample Initial Reports
INSERT INTO reports (nama, deskripsi, status, reporter_id, reviewed_by, reviewed_at)
SELECT 
    'Survei Lapangan Lahan Pertanian Blok A',
    'Pengecekan kontur tanah dan batas patok wilayah lahan pertanian Blok A.',
    'pending',
    u_pelapor.id,
    NULL,
    NULL
FROM users u_pelapor
WHERE u_pelapor.email = 'pelapor@example.dev'
AND NOT EXISTS (SELECT 1 FROM reports WHERE nama = 'Survei Lapangan Lahan Pertanian Blok A');

INSERT INTO reports (nama, deskripsi, status, reporter_id, reviewed_by, reviewed_at)
SELECT 
    'Inspeksi Pemetaan Batas Hutan Lindung',
    'Pengukuran koordinat GPS pilar 01 sampai 15 di kawasan batas hutan lindung selesai dilakukan.',
    'approved',
    u_pelapor.id,
    u_approver.id,
    NOW() - INTERVAL '1 day'
FROM users u_pelapor, users u_approver
WHERE u_pelapor.email = 'pelapor@example.dev' AND u_approver.email = 'approver@example.dev'
AND NOT EXISTS (SELECT 1 FROM reports WHERE nama = 'Inspeksi Pemetaan Batas Hutan Lindung');

INSERT INTO reports (nama, deskripsi, status, reporter_id, reviewed_by, reviewed_at)
SELECT 
    'Verifikasi Saluran Drainase Kawasan Industri',
    'Dokumentasi ketinggian sedimentasi saluran pembuangan utama. Foto bukti lampiran belum lengkap.',
    'rejected',
    u_pelapor.id,
    u_approver.id,
    NOW() - INTERVAL '2 hours'
FROM users u_pelapor, users u_approver
WHERE u_pelapor.email = 'pelapor@example.dev' AND u_approver.email = 'approver@example.dev'
AND NOT EXISTS (SELECT 1 FROM reports WHERE nama = 'Verifikasi Saluran Drainase Kawasan Industri');
