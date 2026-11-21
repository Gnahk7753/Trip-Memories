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
export const vnd = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
export const num = (s) => parseInt(String(s ?? '').replace(/\D/g, ''), 10) || 0;
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
