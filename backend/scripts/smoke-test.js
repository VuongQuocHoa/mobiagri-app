const { spawn } = require('node:child_process');
const prisma = require('../src/config/db');

const port = 4101;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['src/server.js'], { cwd: __dirname + '/..', env: { ...process.env, PORT: String(port), NODE_ENV: 'test' }, stdio: 'ignore' });

const request = async (path, options) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { status: response.status, body };
};

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const result = await request('/api/health');
      if (result.status === 200) return result;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Backend did not become healthy.');
};

(async () => {
  let registeredEmail;
  let smokePostId;
  try {
    const health = await waitForHealth();
    if (health.body.database !== 'ok') throw new Error('Database health check failed.');
    const unauthenticated = await request('/api/farm/logs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plotId: 1, date: '2026-09-11', activity: 'Test', item: 'Test' }) });
    if (unauthenticated.status !== 401) throw new Error(`Expected 401, got ${unauthenticated.status}.`);
    const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL || 'admin@mobiagri.local', password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe-123!' }) });
    if (login.status !== 200 || !login.body.token) throw new Error('Login smoke test failed.');
    registeredEmail = `smoke-${Date.now()}@example.com`;
    const registration = await request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Tài khoản smoke', email: registeredEmail, password: 'Smoke-Test-123!' }) });
    if (registration.status !== 201 || !registration.body.token || registration.body.user.role !== 'member') throw new Error('Registration smoke test failed.');
    const post = await request('/api/forum/posts', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${registration.body.token}` }, body: JSON.stringify({ author: 'Danh tính giả', title: 'Smoke test', content: 'Kiểm tra danh tính xác thực.' }) });
    if (post.status !== 201 || post.body.post.author !== 'Tài khoản smoke') throw new Error('Authenticated author smoke test failed.');
    smokePostId = post.body.post.id;
    const restrictedPlot = await request('/api/farm/plots', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${registration.body.token}` }, body: JSON.stringify({ name: 'Lô không được phép', cropType: 'Lúa', areaHa: 1 }) });
    if (restrictedPlot.status !== 403) throw new Error(`Role guard smoke test failed: ${restrictedPlot.status}.`);
    const plots = await request('/api/farm/plots');
    if (plots.status !== 200 || !Array.isArray(plots.body.plots)) throw new Error('Persisted plots smoke test failed.');
    console.log('Smoke test passed: health, database, auth guard, login, registration, authenticated author, persisted plots.');
  } finally {
    server.kill();
    if (smokePostId) await prisma.communityPost.delete({ where: { id: smokePostId } }).catch(() => {});
    if (registeredEmail) await prisma.user.deleteMany({ where: { email: registeredEmail } });
    await prisma.$disconnect();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
