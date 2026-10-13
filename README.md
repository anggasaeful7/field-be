# Field Report Management System (MAPID Case Study)

**Field Report Management System** adalah platform web terpadu yang dirancang untuk mencatat, memantau, dan memvalidasi laporan kegiatan tim lapangan secara terstruktur, transparan, dan real-time. Sistem ini menghubungkan alur kerja operasional antara personel di lapangan (**Pelapor**), supervisor/peninjau (**Approver**), dan administrator (**Admin**).

### Apa yang Dilakukan Aplikasi Ini?
1. **Pencatatan Laporan Lapangan**: Memfasilitasi tim lapangan untuk membuat dan mendokumentasikan laporan temuan/kegiatan dengan status awal `pending`.
2. **Integritas & Proteksi Data**: Pelapor dapat mengedit laporannya selama status masih `pending`. Begitu laporan sudah ditinjau (`approved` atau `rejected`), data terkunci dari perubahan untuk menjaga validitas dokumen.
3. **Alur Persetujuan Bertingkat (Approval Flow)**: Tim Approver dapat meninjau seluruh laporan lapangan, memutuskan persetujuan (`Approved` atau `Rejected`), serta fleksibel mengubah kembali status jika ada klarifikasi lanjutan.
4. **Jejak Audit Transparan (Audit Trail)**: Setiap keputusan verifikasi otomatis mencatat identitas reviewer (`reviewed_by`) dan stempel waktu persetujuan (`reviewed_at`).
5. **Kontrol Akses Berbasis Peran (RBAC)**:
   - **Pelapor**: Isolasi data ketat — hanya dapat melihat dan mengelola laporan miliknya sendiri.
   - **Approver**: Akses agregat ke seluruh laporan untuk proses validasi.
   - **Admin**: Akses menyeluruh termasuk manajemen akun pengguna terpusat (tanpa registrasi publik).

- **Live URL**: *(Opsional: masukkan tautan deploy jika ada, misal: https://field.angscode.com)*
- **Repository FrontEnd**: *([Link repo GitHub](https://github.com/anggasaeful7/field-fe))*
- **Repository BackEnd**: *([Link repo GitHub](https://github.com/anggasaeful7/field-be))*

---

## Akun Demo

Gunakan kredensial akun berikut untuk masuk ke dashboard:

| Role | Email | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@mapid.dev` | `admin123` | Kelola akun pengguna, lihat semua laporan, approve/reject |
| **Pelapor** | `pelapor@mapid.dev` | `pelapor123` | Buat laporan, lihat laporan sendiri, edit saat pending |
| **Approver** | `approver@mapid.dev` | `approver123` | Lihat semua laporan, aksi approve/reject & toggle status |

*Catatan: Akun dibuat oleh Admin, tidak ada registrasi mandiri.*

---

## Cara Menjalankan Project

### A. Lokal (Tanpa Docker)

#### 1. Backend (`BE`)
```bash
cd BE
npm install
npm run db:init   # Menjalankan schema.sql & seed data ke Neon DB
npm run dev       # Berjalan di http://localhost:3000
```
> Variabel `.env` sudah disiapkan (atau copy dari `.env.example`).
> Jalankan `npm test` untuk memverifikasi 10 pengujian integrasi API & RBAC.

#### 2. Frontend (`FE`)
```bash
cd FE
npm install
npm run dev       # Berjalan di http://localhost:5173
```

---

### B. Deploy di VPS (Docker Compose)

Cukup satu perintah di root folder:
```bash
docker compose up -d --build
```
- **Aplikasi**: Buka `http://<IP-VPS>` (Port 80 via Nginx).
- **Backend**: Otomatis di-reverse proxy oleh Nginx ke `http://backend:3000/api/`.

---

## REST API Summary

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Publik | Login & generate JWT token |
| `GET` | `/api/auth/me` | Auth | Data profil user aktif |
| `GET` | `/api/users` | Admin | Daftar akun pengguna |
| `POST` | `/api/users` | Admin | Buat akun baru (Admin-only) |
| `GET` | `/api/reports` | Auth | Pelapor (hanya miliknya) / Approver & Admin (semua) |
| `POST` | `/api/reports` | Pelapor, Admin | Buat laporan (default `pending`) |
| `PUT` | `/api/reports/:id` | Pelapor, Admin | Edit laporan (hanya jika `pending`) |
| `PATCH` | `/api/reports/:id/status` | Approver, Admin | Approve/Reject & toggle status (mencatat audit reviewer & waktu) |

---