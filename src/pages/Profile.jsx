import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.full_name);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    try { const d = await api.put('/me', { full_name: name }); setUser(d.user); setMsg('Đã lưu tên'); } catch (x) { setMsg(x.message); }
  };
  const uploadQr = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setBusy(true); setMsg('');
    try {
      const fd = new FormData(); fd.append('qr', file);
      const d = await api.post('/me/qr', fd); setUser(d.user); setMsg('Đã cập nhật mã QR');
    } catch (x) { setMsg(x.message); } finally { setBusy(false); e.target.value = ''; }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Hồ sơ cá nhân</h1>
      <form onSubmit={saveName} className="card p-4 space-y-3">
        <div><label className="label">Tên đăng nhập</label><input className="input bg-slate-100" value={user.username} disabled /></div>
        <div><label className="label">Tên thật</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <button className="btn btn-primary">Lưu</button>
      </form>
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Mã QR nhận tiền của tôi</h2>
        <p className="text-sm text-slate-500">Bạn bè sẽ thấy mã này khi cần chuyển khoản cho bạn.</p>
        {user.qr_url ? <img src={user.qr_url} alt="QR" className="w-56 max-w-full rounded-lg border" /> : <p className="text-sm text-amber-600">Bạn chưa tải mã QR.</p>}
        <input type="file" accept="image/*" onChange={uploadQr} disabled={busy}
          className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-indigo-700" />
        {busy && <p className="text-sm text-slate-500">Đang tải lên…</p>}
      </div>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
