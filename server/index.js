import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { q, pool } from './db.js';
import { signIn, requireAuth } from './auth.js';
import { upload, uploadToCloud } from './upload.js';
import { computeDebts } from './debts.js';
import { migrate } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // Render đứng sau proxy HTTPS => cookie secure hoạt động
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const publicUser = (u) => ({ id: u.id, username: u.username, full_name: u.full_name, qr_url: u.qr_url });

// Chỉ thành viên của chuyến đi mới được xem / thao tác
const member = h(async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return bad(res, 'Không tìm thấy chuyến đi', 404);
  const { rows } = await q('SELECT 1 FROM trip_members WHERE trip_id=$1 AND user_id=$2', [req.params.id, req.userId]);
  if (!rows.length) return bad(res, 'Bạn không thuộc chuyến đi này', 403);
  next();
});

app.get('/healthz', (_req, res) => res.send('ok'));

/* ---------------- Auth & Profile ---------------- */
app.post('/api/auth/register', h(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const full_name = String(req.body.full_name || '').trim();
  if (process.env.INVITE_CODE && req.body.invite_code !== process.env.INVITE_CODE) return bad(res, 'Mã mời không đúng');
  if (!/^[a-z0-9_.]{3,30}$/.test(username)) return bad(res, 'Tên đăng nhập 3-30 ký tự (a-z, 0-9, _ .)');
  if (password.length < 6) return bad(res, 'Mật khẩu tối thiểu 6 ký tự');
  if (!full_name) return bad(res, 'Vui lòng nhập tên thật');
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await q('INSERT INTO users(username,password_hash,full_name) VALUES($1,$2,$3) RETURNING *', [username, hash, full_name]);
    signIn(res, rows[0]);
    res.json({ user: publicUser(rows[0]) });
  } catch (e) {
    if (e.code === '23505') return bad(res, 'Tên đăng nhập đã tồn tại', 409);
    throw e;
  }
}));

app.post('/api/auth/login', h(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const { rows } = await q('SELECT * FROM users WHERE username=$1', [username]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password_hash))) return bad(res, 'Sai tên đăng nhập hoặc mật khẩu', 401);
  signIn(res, u);
  res.json({ user: publicUser(u) });
}));

app.post('/api/auth/logout', (_req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

app.get('/api/me', requireAuth, h(async (req, res) => {
  const { rows } = await q('SELECT * FROM users WHERE id=$1', [req.userId]);
  if (!rows[0]) return bad(res, 'Chưa đăng nhập', 401);
  res.json({ user: publicUser(rows[0]) });
}));

app.put('/api/me', requireAuth, h(async (req, res) => {
  const full_name = String(req.body.full_name || '').trim();
  if (!full_name) return bad(res, 'Tên thật không được để trống');
  const { rows } = await q('UPDATE users SET full_name=$1 WHERE id=$2 RETURNING *', [full_name, req.userId]);
  res.json({ user: publicUser(rows[0]) });
}));

app.put('/api/me/password', requireAuth, h(async (req, res) => {
  const cur = String(req.body.current_password || '');
  const next = String(req.body.new_password || '');
  if (next.length < 6) return bad(res, 'Mật khẩu mới tối thiểu 6 ký tự');
  const { rows } = await q('SELECT password_hash FROM users WHERE id=$1', [req.userId]);
  if (!rows[0] || !(await bcrypt.compare(cur, rows[0].password_hash))) return bad(res, 'Mật khẩu hiện tại không đúng');
  await q('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(next, 10), req.userId]);
  res.json({ ok: true });
}));

app.post('/api/me/qr', requireAuth, upload.single('qr'), h(async (req, res) => {
  if (!req.file) return bad(res, 'Chưa chọn ảnh QR');
  if (!req.file.mimetype.startsWith('image/')) return bad(res, 'QR phải là ảnh');
  const { url } = await uploadToCloud(req.file, 'qr');
  const { rows } = await q('UPDATE users SET qr_url=$1 WHERE id=$2 RETURNING *', [url, req.userId]);
  res.json({ user: publicUser(rows[0]) });
}));

app.get('/api/users', requireAuth, h(async (_req, res) => {
  const { rows } = await q('SELECT id, username, full_name FROM users ORDER BY full_name');
  res.json({ users: rows });
}));

/* ---------------- Trips ---------------- */
app.get('/api/trips', requireAuth, h(async (req, res) => {
  const { rows } = await q(
    `SELECT t.id, t.name, t.trip_date, t.cover_url, t.description,
            json_agg(json_build_object('id', u.id, 'full_name', u.full_name) ORDER BY u.full_name) AS members
       FROM trips t
       JOIN trip_members tm ON tm.trip_id = t.id
       JOIN users u ON u.id = tm.user_id
      WHERE t.id IN (SELECT trip_id FROM trip_members WHERE user_id = $1)
      GROUP BY t.id
      ORDER BY t.trip_date DESC, t.id DESC`, [req.userId]);
  res.json({ trips: rows });
}));

app.post('/api/trips', requireAuth, upload.array('media', 20), h(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const trip_date = String(req.body.trip_date || '');
  const description = String(req.body.description || '').trim();
  let ids = [];
  try { ids = JSON.parse(req.body.members || '[]').map(Number).filter(Number.isInteger); } catch { /* bỏ qua */ }
  ids = [...new Set([...ids, req.userId])];
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(trip_date)) return bad(res, 'Thiếu tên chuyến đi hoặc ngày đi');
  if (ids.length < 2) return bad(res, 'Hãy chọn ít nhất một người cùng đi');
  const { rows: valid } = await q('SELECT id FROM users WHERE id = ANY($1)', [ids]);
  if (valid.length !== ids.length) return bad(res, 'Có thành viên không tồn tại');

  const uploaded = await Promise.all((req.files || []).map((f) => uploadToCloud(f, 'trips')));
  const cover = uploaded.find((u) => u.type === 'image')?.url || null;

  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query(
      'INSERT INTO trips(name,trip_date,description,cover_url,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [name, trip_date, description || null, cover, req.userId]);
    const id = rows[0].id;
    for (const uid of ids) await c.query('INSERT INTO trip_members(trip_id,user_id) VALUES($1,$2)', [id, uid]);
    for (const u of uploaded) await c.query('INSERT INTO trip_media(trip_id,url,media_type,uploaded_by) VALUES($1,$2,$3,$4)', [id, u.url, u.type, req.userId]);
    await c.query('COMMIT');
    res.json({ id });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));

app.get('/api/trips/:id', requireAuth, member, h(async (req, res) => {
  const id = req.params.id;
  const [t, m, md, cm] = await Promise.all([
    q('SELECT * FROM trips WHERE id=$1', [id]),
    q('SELECT u.id, u.full_name, u.username FROM trip_members tm JOIN users u ON u.id=tm.user_id WHERE tm.trip_id=$1 ORDER BY u.full_name', [id]),
    q('SELECT id, url, media_type FROM trip_media WHERE trip_id=$1 ORDER BY id', [id]),
    q('SELECT c.id, c.content, c.created_at, u.full_name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.trip_id=$1 ORDER BY c.created_at', [id]),
  ]);
  res.json({ trip: t.rows[0], members: m.rows, media: md.rows, comments: cm.rows });
}));

app.post('/api/trips/:id/media', requireAuth, member, upload.array('media', 20), h(async (req, res) => {
  if (!req.files?.length) return bad(res, 'Chưa chọn file');
  const uploaded = await Promise.all(req.files.map((f) => uploadToCloud(f, 'trips')));
  const added = [];
  for (const u of uploaded) {
    const { rows } = await q('INSERT INTO trip_media(trip_id,url,media_type,uploaded_by) VALUES($1,$2,$3,$4) RETURNING id, url, media_type', [req.params.id, u.url, u.type, req.userId]);
    added.push(rows[0]);
  }
  const firstImg = uploaded.find((u) => u.type === 'image');
  if (firstImg) await q('UPDATE trips SET cover_url=$1 WHERE id=$2 AND cover_url IS NULL', [firstImg.url, req.params.id]);
  res.json({ media: added });
}));

app.post('/api/trips/:id/comments', requireAuth, member, h(async (req, res) => {
  const content = String(req.body.content || '').trim();
  if (!content) return bad(res, 'Nội dung trống');
  const { rows } = await q(
    `WITH c AS (INSERT INTO comments(trip_id,user_id,content) VALUES($1,$2,$3) RETURNING id, content, created_at)
     SELECT c.id, c.content, c.created_at, u.full_name FROM c, users u WHERE u.id = $2`,
    [req.params.id, req.userId, content.slice(0, 2000)]);
  res.json({ comment: rows[0] });
}));

/* ---------------- Expenses ---------------- */
app.get('/api/trips/:id/expenses', requireAuth, member, h(async (req, res) => {
  const { rows } = await q(
    `SELECT e.id, e.title, e.amount, e.split_type, e.payer_id, e.created_by, e.created_at, p.full_name AS payer_name,
            json_agg(json_build_object('user_id', s.user_id, 'full_name', u.full_name, 'amount', s.amount) ORDER BY u.full_name) AS shares
       FROM expenses e
       JOIN users p ON p.id = e.payer_id
       JOIN expense_shares s ON s.expense_id = e.id
       JOIN users u ON u.id = s.user_id
      WHERE e.trip_id = $1
      GROUP BY e.id, p.full_name
      ORDER BY e.created_at DESC`, [req.params.id]);
  res.json({ expenses: rows });
}));

app.post('/api/trips/:id/expenses', requireAuth, member, h(async (req, res) => {
  const tid = Number(req.params.id);
  const { payer_id, amount, split_type, participants = [], shares = [] } = req.body;
  const title = String(req.body.title || '').trim();
  const total = Number(amount);
  if (!title || !Number.isInteger(total) || total <= 0) return bad(res, 'Tên khoản chi hoặc số tiền không hợp lệ');
  const { rows: mem } = await q('SELECT user_id FROM trip_members WHERE trip_id=$1', [tid]);
  const ids = new Set(mem.map((r) => r.user_id));
  if (!ids.has(Number(payer_id))) return bad(res, 'Người trả tiền không thuộc chuyến đi');

  let list;
  if (split_type === 'equal') {
    const p = [...new Set(participants.map(Number))].filter((x) => ids.has(x));
    if (!p.length) return bad(res, 'Chọn ít nhất 1 người chia tiền');
    const base = Math.floor(total / p.length);
    const rem = total - base * p.length; // phần lẻ chia cho những người đầu danh sách
    list = p.map((uid, i) => ({ user_id: uid, amount: base + (i < rem ? 1 : 0) }));
  } else if (split_type === 'custom') {
    list = shares.map((s) => ({ user_id: Number(s.user_id), amount: Number(s.amount) })).filter((s) => s.amount > 0);
    if (!list.length || new Set(list.map((s) => s.user_id)).size !== list.length || list.some((s) => !ids.has(s.user_id) || !Number.isInteger(s.amount)))
      return bad(res, 'Danh sách chia không hợp lệ');
    if (list.reduce((a, s) => a + s.amount, 0) !== total) return bad(res, 'Tổng tiền chia không khớp hóa đơn');
  } else return bad(res, 'Kiểu chia không hợp lệ');

  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query(
      'INSERT INTO expenses(trip_id,title,payer_id,amount,split_type,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      [tid, title, Number(payer_id), total, split_type, req.userId]);
    for (const s of list) await c.query('INSERT INTO expense_shares(expense_id,user_id,amount) VALUES($1,$2,$3)', [rows[0].id, s.user_id, s.amount]);
    await c.query('COMMIT');
    res.json({ id: rows[0].id });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));

app.delete('/api/trips/:id/expenses/:eid', requireAuth, member, h(async (req, res) => {
  const r = await q('DELETE FROM expenses WHERE id=$1 AND trip_id=$2 AND (created_by=$3 OR payer_id=$3)', [req.params.eid, req.params.id, req.userId]);
  if (!r.rowCount) return bad(res, 'Chỉ người tạo hoặc người trả tiền mới được xoá', 403);
  res.json({ ok: true });
}));

/* ---------------- Công nợ & thanh toán ---------------- */
app.get('/api/trips/:id/debts', requireAuth, member, h(async (req, res) => {
  const debts = await computeDebts(Number(req.params.id));
  const { rows } = await q('SELECT id, full_name, qr_url FROM users WHERE id IN (SELECT user_id FROM trip_members WHERE trip_id=$1)', [req.params.id]);
  const u = Object.fromEntries(rows.map((r) => [r.id, r]));
  res.json({ debts: debts.map((d) => ({ ...d, from_name: u[d.from]?.full_name, to_name: u[d.to]?.full_name, to_qr: u[d.to]?.qr_url || null })) });
}));

// Con nợ bấm "Tôi đã chuyển khoản" -> tạo payment pending
app.post('/api/trips/:id/payments', requireAuth, member, h(async (req, res) => {
  const tid = Number(req.params.id);
  const to = Number(req.body.to_user);
  const d = (await computeDebts(tid)).find((x) => x.from === req.userId && x.to === to);
  if (!d) return bad(res, 'Bạn không còn khoản nợ nào với người này');
  const left = d.amount - d.pending;
  if (left <= 0) return bad(res, 'Đang chờ người nhận xác nhận');
  await q('INSERT INTO payments(trip_id,from_user,to_user,amount) VALUES($1,$2,$3,$4)', [tid, req.userId, to, left]);
  res.json({ ok: true });
}));

// Chủ nợ xác nhận đã nhận tiền -> payment confirmed, công nợ được trừ
app.post('/api/trips/:id/payments/confirm', requireAuth, member, h(async (req, res) => {
  const tid = Number(req.params.id);
  const from = Number(req.body.from_user);
  const d = (await computeDebts(tid)).find((x) => x.from === from && x.to === req.userId);
  if (!d) return res.json({ ok: true });
  const r = await q(
    `UPDATE payments SET status='confirmed', confirmed_at=now()
      WHERE trip_id=$1 AND from_user=$2 AND to_user=$3 AND status='pending'`, [tid, from, req.userId]);
  if (r.rowCount === 0) // chưa có báo chuyển khoản: chủ nợ xác nhận thẳng toàn bộ số còn nợ
    await q(`INSERT INTO payments(trip_id,from_user,to_user,amount,status,confirmed_at) VALUES($1,$2,$3,$4,'confirmed',now())`, [tid, from, req.userId, d.amount]);
  res.json({ ok: true });
}));

/* ---------------- Static (React build) ---------------- */
const dist = path.join(__dirname, '../dist');
app.use(express.static(dist));
app.use('/api', (_req, res) => bad(res, 'Not found', 404));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Lỗi máy chủ' });
});

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('Thiếu biến môi trường JWT_SECRET');
  process.exit(1);
}
const PORT = process.env.PORT || 3000;
migrate()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server chạy tại cổng ${PORT}`)))
  .catch((e) => { console.error('Không kết nối được database:', e.message); process.exit(1); });
