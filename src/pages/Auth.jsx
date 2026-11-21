import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Auth() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ username: '', password: '', full_name: '', invite_code: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const d = await api.post(mode === 'login' ? '/auth/login' : '/auth/register', f);
      setUser(d.user);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <img src="/logo.png" alt="" className="w-20 h-20 mx-auto" />
          <h1 className="text-xl font-bold mt-1">Kỷ niệm chuyến đi</h1>
          <p className="text-sm text-slate-500">{mode === 'login' ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản nội bộ'}</p>
        </div>
        {mode === 'register' && (
          <div><label className="label">Tên thật</label><input className="input" value={f.full_name} onChange={set('full_name')} required /></div>
        )}
        <div><label className="label">Tên đăng nhập</label><input className="input" value={f.username} onChange={set('username')} autoCapitalize="none" required /></div>
        <div><label className="label">Mật khẩu</label><input type="password" className="input" value={f.password} onChange={set('password')} required /></div>
        {mode === 'register' && (
          <div><label className="label">Mã mời (nếu có)</label><input className="input" value={f.invite_code} onChange={set('invite_code')} /></div>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button>
        <button type="button" className="w-full text-sm text-indigo-600" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
