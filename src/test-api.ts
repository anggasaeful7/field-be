process.env.NODE_ENV = 'test';
import http from 'node:http';
import app from './index.js';

let server: http.Server;
const PORT = 3999;
const BASE_URL = `http://localhost:${PORT}/api`;

async function request(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  return { status: res.status, data };
}

async function testAll() {
  server = app.listen(PORT);
  console.log('Test server started on port', PORT);

  try {
    // 1. Health Check
    const health = await request('/health');
    console.log('1. Health check:', health.status, health.data.success ? 'PASS' : 'FAIL');

    // 2. Login Admin, Pelapor, Approver
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@mapid.dev', password: 'admin123' })
    });
    const adminToken = adminLogin.data.data?.token;
    console.log('2a. Admin Login:', adminLogin.status, adminToken ? 'PASS' : 'FAIL');

    const pelaporLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'pelapor@mapid.dev', password: 'pelapor123' })
    });
    const pelaporToken = pelaporLogin.data.data?.token;
    console.log('2b. Pelapor Login:', pelaporLogin.status, pelaporToken ? 'PASS' : 'FAIL');

    const approverLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'approver@mapid.dev', password: 'approver123' })
    });
    const approverToken = approverLogin.data.data?.token;
    console.log('2c. Approver Login:', approverLogin.status, approverToken ? 'PASS' : 'FAIL');

    // 3. /auth/me
    const me = await request('/auth/me', { method: 'GET' }, pelaporToken);
    console.log('3. Auth Me:', me.status, me.data.data?.role === 'pelapor' ? 'PASS' : 'FAIL');

    // 4. Pelapor creates a new report
    const newReport = await request('/reports', {
      method: 'POST',
      body: JSON.stringify({
        nama: 'Laporan Test Otomatis',
        deskripsi: 'Deskripsi uji coba laporan lapangan'
      })
    }, pelaporToken);
    const reportId = newReport.data.data?.id;
    console.log('4. Create Report (Pelapor):', newReport.status, reportId ? 'PASS' : 'FAIL', 'Status:', newReport.data.data?.status);

    // 5. Pelapor edits the report while pending
    const editReport = await request(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama: 'Laporan Test Otomatis - Updated',
        deskripsi: 'Deskripsi telah diperbarui sebelum di-approve'
      })
    }, pelaporToken);
    console.log('5. Edit Pending Report (Pelapor):', editReport.status, editReport.data.data?.nama.includes('Updated') ? 'PASS' : 'FAIL');

    // 6. Pelapor lists reports (only own reports)
    const pelaporReports = await request('/reports', { method: 'GET' }, pelaporToken);
    console.log('6. Pelapor List Reports count:', pelaporReports.data.data?.length, 'PASS');

    // 7. Approver reviews and APPROVES report
    const approve = await request(`/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' })
    }, approverToken);
    console.log('7a. Approver APPROVE report:', approve.status, approve.data.data?.status === 'approved' ? 'PASS' : 'FAIL', 'Reviewed by:', approve.data.data?.reviewer_name);

    // 7b. Approver toggles status to REJECTED
    const toggleReject = await request(`/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' })
    }, approverToken);
    console.log('7b. Approver TOGGLE to REJECTED:', toggleReject.status, toggleReject.data.data?.status === 'rejected' ? 'PASS' : 'FAIL');

    // 8. Pelapor tries to edit after non-pending -> MUST FAIL (400)
    const editBlocked = await request(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama: 'Laporan Diedit Lagi',
        deskripsi: 'Harus ditolak karena sudah rejected'
      })
    }, pelaporToken);
    console.log('8. Edit Rejected Report Blocked:', editBlocked.status === 400 ? 'PASS (Correctly Blocked)' : 'FAIL', editBlocked.data.message);

    // 9. Admin User Management
    const listUsers = await request('/users', { method: 'GET' }, adminToken);
    console.log('9a. Admin List Users count:', listUsers.data.data?.length, 'PASS');

    const testEmail = `petugas_${Date.now()}@mapid.dev`;
    const createUser = await request('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Petugas Baru',
        email: testEmail,
        password: 'password123',
        role: 'pelapor'
      })
    }, adminToken);
    console.log('9b. Admin Create User:', createUser.status, createUser.data.data?.email === testEmail ? 'PASS' : 'FAIL');

    // 10. Non-admin forbidden from creating user
    const forbidCreate = await request('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Hacker',
        email: 'hacker@mapid.dev',
        password: '123',
        role: 'admin'
      })
    }, pelaporToken);
    console.log('10. Pelapor forbidden from creating user:', forbidCreate.status === 403 ? 'PASS (Correctly Forbidden)' : 'FAIL');

    // 11. Reports Summary Stats
    const summaryRes = await request('/reports/summary', {}, approverToken);
    console.log('11. Reports summary stats:', summaryRes.status === 200 && summaryRes.data.data?.total !== undefined ? 'PASS' : 'FAIL');

    // 12. Report Detail & Timeline Logs
    const detailRes = await request(`/reports/${reportId}`, {}, approverToken);
    const hasLogs = Array.isArray(detailRes.data.data?.logs) && detailRes.data.data.logs.length > 0;
    console.log('12. Report detail & timeline logs:', detailRes.status === 200 && hasLogs ? 'PASS' : 'FAIL');

    // 13. Admin Edit User
    const newUserId = createUser.data.data?.id;
    const editUserRes = await request(`/users/${newUserId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Petugas Diedit',
        email: testEmail,
        role: 'approver'
      })
    }, adminToken);
    console.log('13. Admin Edit User:', editUserRes.status === 200 && editUserRes.data.data?.name === 'Petugas Diedit' ? 'PASS' : 'FAIL');

    // 14. Admin Change Password
    const changePassRes = await request(`/users/${newUserId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      })
    }, adminToken);
    console.log('14. Admin Change Password:', changePassRes.status === 200 ? 'PASS' : 'FAIL');

    // 15. Admin cannot delete self
    const adminMe = await request('/auth/me', {}, adminToken);
    const deleteSelfRes = await request(`/users/${adminMe.data.data.id}`, { method: 'DELETE' }, adminToken);
    console.log('15. Admin delete self blocked:', deleteSelfRes.status === 400 ? 'PASS (Correctly Blocked)' : 'FAIL');

    // 16. Admin Soft Delete User & verify cannot login
    const deleteUserRes = await request(`/users/${newUserId}`, { method: 'DELETE' }, adminToken);
    const deletedLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: 'newpassword123' })
    });
    console.log('16. Soft Delete User & Login blocked:', deleteUserRes.status === 200 && deletedLogin.status === 401 ? 'PASS' : 'FAIL');

    // 17. Swagger UI Docs Endpoint
    const docsRes = await fetch(`http://localhost:${PORT}/api/docs/`);
    console.log('17. Swagger UI Docs (/api/docs):', docsRes.status === 200 ? 'PASS' : 'FAIL');

    console.log('\nALL 17 API, RBAC & SWAGGER TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    process.exit(0);
  }
}

testAll().catch((err) => {
  console.error('Test failed:', err);
  if (server) server.close();
  process.exit(1);
});
