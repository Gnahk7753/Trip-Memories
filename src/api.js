async function req(method, url, body) {
  const opt = { method, credentials: 'same-origin', headers: {} };
  if (body instanceof FormData) opt.body = body;
  else if (body) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  const r = await fetch('/api' + url, opt);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Có lỗi xảy ra');
  return d;
}
export const api = {
  get: (u) => req('GET', u),
  post: (u, b) => req('POST', u, b),
  put: (u, b) => req('PUT', u, b),
  del: (u) => req('DELETE', u),
};
// Tiền lưu trong database theo đồng (số nguyên). Giao diện nhập/hiển thị theo "k" (nghìn đồng):
// 300 = 300k = 300.000đ ; 8,333 = 8,333k = 8.333đ (3 số thập phân sau dấu phẩy = chính xác đến 1đ)
export const vnd = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(n) / 1000) + 'k';
export const fullVnd = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
// Làm sạch chuỗi người dùng gõ: chỉ giữ số và 1 dấu thập phân (gõ , hoặc . đều được), tối đa 3 số lẻ
export const cleanK = (s) => {
  let t = String(s ?? '').replace(/[^\d.,]/g, '').replace(/\./g, ',');
  const i = t.indexOf(',');
  if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/,/g, '').slice(0, 3);
  return t;
};
// "8,333" (k) -> 8333 (đồng)
export const num = (s) => {
  const [a = '', b = ''] = cleanK(s).split(',');
  return (parseInt(a || '0', 10) || 0) * 1000 + (parseInt(b.padEnd(3, '0') || '0', 10) || 0);
};
export const fmtDate = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
export const fmtTime = (s) => new Date(s).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

// Cloudinary: chèn fl_attachment để trình duyệt tải file về máy (không mở tab mới)
export const dlUrl = (u) => (u.includes('/upload/') ? u.replace('/upload/', '/upload/fl_attachment/') : u);
export function download(url) {
  const a = document.createElement('a');
  a.href = dlUrl(url);
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Tải nhiều file theo từng đợt nhỏ (tối đa 5 file hoặc ~60MB/đợt) => không giới hạn số lượng
// mà server (RAM Render) và Cloudinary vẫn xử lý ổn. onProgress(đã xong, tổng).
export function makeBatches(files, maxCount = 5, maxBytes = 60 * 1024 * 1024) {
  const batches = []; let cur = []; let bytes = 0;
  for (const f of files) {
    if (cur.length && (cur.length >= maxCount || bytes + f.size > maxBytes)) { batches.push(cur); cur = []; bytes = 0; }
    cur.push(f); bytes += f.size;
  }
  if (cur.length) batches.push(cur);
  return batches;
}
export async function uploadMedia(tripId, files, onProgress = () => {}, onBatch = () => {}) {
  let done = 0; const failed = [];
  onProgress(0, files.length);
  for (const batch of makeBatches(files)) {
    try {
      const fd = new FormData(); batch.forEach((f) => fd.append('media', f));
      const d = await api.post(`/trips/${tripId}/media`, fd);
      onBatch(d.media);
    } catch (e) { failed.push(...batch.map((f) => f.name)); }
    done += batch.length; onProgress(done, files.length);
  }
  return { total: files.length, failed };
}