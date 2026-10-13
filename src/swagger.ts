export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Field Report Management System API (MAPID Case Study)',
    version: '1.0.0',
    description:
      'Dokumentasi REST API resmi untuk Field Report Management System. Mendukung otentikasi JWT, RBAC multi-peran (Admin, Pelapor, Approver), jejak audit verifikasi, dan manajemen pengguna.',
    contact: {
      name: 'Fullstack Dev Case Study - MAPID',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Current Environment API Base',
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Localhost Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Masukkan token JWT yang didapatkan dari endpoint /auth/login.',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@mapid.dev' },
          password: { type: 'string', example: 'admin123' },
        },
      },
      CreateReportRequest: {
        type: 'object',
        required: ['nama', 'deskripsi'],
        properties: {
          nama: { type: 'string', example: 'Survei Geospasial Wilayah Cisarua' },
          deskripsi: { type: 'string', example: 'Pengecekan batas patok koordinat GPS area barat.' },
        },
      },
      UpdateReportRequest: {
        type: 'object',
        required: ['nama', 'deskripsi'],
        properties: {
          nama: { type: 'string', example: 'Survei Geospasial Wilayah Cisarua (Revisi)' },
          deskripsi: { type: 'string', example: 'Pembaruan catatan hasil verifikasi awal.' },
        },
      },
      UpdateReportStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
          note: { type: 'string', example: 'Dokumen dan foto bukti telah diverifikasi lengkap.' },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password', 'role'],
        properties: {
          name: { type: 'string', example: 'Rian Lapangan' },
          email: { type: 'string', example: 'rian@mapid.dev' },
          password: { type: 'string', example: 'password123' },
          role: { type: 'string', enum: ['admin', 'pelapor', 'approver'], example: 'pelapor' },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'role'],
        properties: {
          name: { type: 'string', example: 'Rian Lapangan Utama' },
          email: { type: 'string', example: 'rian.utama@mapid.dev' },
          role: { type: 'string', enum: ['admin', 'pelapor', 'approver'], example: 'pelapor' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['newPassword', 'confirmPassword'],
        properties: {
          newPassword: { type: 'string', example: 'newpassword123' },
          confirmPassword: { type: 'string', example: 'newpassword123' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Pemeriksaan Kesehatan Server (Health Check)',
        responses: {
          200: {
            description: 'Server dalam kondisi sehat',
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login Akun Pengguna',
        description: 'Mendapatkan Bearer token JWT untuk otorisasi endpoint lainnya.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Login berhasil, token JWT dihasilkan' },
          401: { description: 'Email atau password salah / akun dinonaktifkan' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Profil Pengguna Aktif',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Data pengguna yang sedang login' },
          401: { description: 'Token tidak valid atau tidak disediakan' },
        },
      },
    },
    '/reports': {
      get: {
        tags: ['Reports'],
        summary: 'Daftar Laporan Lapangan',
        description:
          'Pelapor hanya mendapatkan laporannya sendiri (data isolation). Admin & Approver melihat seluruh laporan.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Array daftar laporan lapangan' },
        },
      },
      post: {
        tags: ['Reports'],
        summary: 'Buat Laporan Baru (Pelapor / Admin)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateReportRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Laporan berhasil dibuat dengan status awal pending' },
          400: { description: 'Validasi gagal' },
        },
      },
    },
    '/reports/summary': {
      get: {
        tags: ['Reports'],
        summary: 'Ringkasan Statistik Dashboard',
        description: 'Total laporan, pending, approved, rejected, serta total pengguna aktif bagi Admin.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Statistik agregasi laporan' },
        },
      },
    },
    '/reports/{id}': {
      get: {
        tags: ['Reports'],
        summary: 'Detail Laporan Beserta Timeline Jejak Audit',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'ID Laporan Lapangan',
          },
        ],
        responses: {
          200: { description: 'Detail laporan lengkap beserta array logs riwayat aktivitas' },
          403: { description: 'Akses ditolak (bukan laporan milik pelapor ini)' },
          404: { description: 'Laporan tidak ditemukan' },
        },
      },
      put: {
        tags: ['Reports'],
        summary: 'Edit Laporan (Hanya jika status pending)',
        description: 'Pelapor hanya bisa mengedit laporannya sendiri saat masih berstatus pending.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateReportRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Laporan berhasil diperbarui' },
          400: { description: 'Laporan bukan berstatus pending' },
        },
      },
    },
    '/reports/{id}/status': {
      patch: {
        tags: ['Reports'],
        summary: 'Approve / Reject & Toggle Status Laporan (Approver & Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateReportStatusRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Status berhasil diubah dan dicatat di riwayat audit' },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users (Admin Only)'],
        summary: 'Daftar Akun Pengguna Aktif',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Daftar pengguna aktif yang belum di-soft delete' },
          403: { description: 'Khusus peran Administrator' },
        },
      },
      post: {
        tags: ['Users (Admin Only)'],
        summary: 'Tambah Pengguna Baru',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Pengguna berhasil dibuat' },
          400: { description: 'Email sudah terdaftar / data tidak lengkap' },
        },
      },
    },
    '/users/{id}': {
      put: {
        tags: ['Users (Admin Only)'],
        summary: 'Edit Data Pengguna',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Data pengguna berhasil diperbarui' },
        },
      },
      delete: {
        tags: ['Users (Admin Only)'],
        summary: 'Soft Delete Pengguna (Nonaktifkan Akun)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: 'Pengguna berhasil dinonaktifkan' },
          400: { description: 'Tidak dapat menghapus akun admin sendiri' },
        },
      },
    },
    '/users/{id}/password': {
      patch: {
        tags: ['Users (Admin Only)'],
        summary: 'Ubah Kata Sandi Pengguna',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Kata sandi berhasil diperbarui' },
          400: { description: 'Konfirmasi kata sandi tidak cocok / kurang dari 6 karakter' },
        },
      },
    },
  },
};
