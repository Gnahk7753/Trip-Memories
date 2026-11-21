import { useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';
import SmartImg from '../components/SmartImg.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.full_name);
  const [saving, setSaving] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();
  const [pw, setPw] = useState({ cur: '', next: '', again: '' });
  const [pwBusy, setPwBusy] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { const d = await api.put('/me', { full_name: name }); setUser(d.user); toast('Đã lưu thay đổi'); }
    catch (x) { toast(x.message, 'error'); } finally { setSaving(false); }
  };

  const uploadQr = async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    const hadQr = !!user.qr_url;
    const url = URL.createObjectURL(file);
    setPreview(url); setQrBusy(true);
    try {
      const fd = new FormData(); fd.append('qr', file);
      const d = await api.post('/me/qr', fd);
      setUser(d.user); toast(hadQr ? 'Đã đổi mã QR' : 'Đã đăng mã QR');
    } catch (x) { toast(x.message, 'error'); } finally { setQrBusy(false); setPreview(null); URL.revokeObjectURL(url); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.next.length < 6) return toast('Mật khẩu mới tối thiểu 6 ký tự', 'error');
    if (pw.next !== pw.again) return toast('Nhập lại mật khẩu mới chưa khớp', 'error');
    setPwBusy(true);
    try {
      await api.put('/me/password', { current_password: pw.cur, new_password: pw.next });
      setPw({ cur: '', next: '', again: '' }); toast('Đổi mật khẩu thành công');
    } catch (x) { toast(x.message, 'error'); } finally { setPwBusy(false); }
  };

  const shown = preview || user.qr_url;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Hồ sơ cá nhân</h1>

      <form onSubmit={saveName} className="card p-4 space-y-3">
        <div><label className="label">Tên đăng nhập</label><input className="input bg-slate-100" value={user.username} disabled /></div>
        <div><label className="label">Tên thật</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
      </form>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Mã QR nhận tiền của tôi</h2>
        <p className="text-sm text-slate-500">Bạn bè sẽ thấy mã này khi cần chuyển khoản cho bạn.</p>
        {shown ? (
          <div className="relative w-56 max-w-full">
            <SmartImg key={shown} src={shown} alt="QR" className="w-full rounded-lg border" />
            {qrBusy && <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center text-sm font-medium text-slate-700">Đang tải lên…</div>}
          </div>
        ) : <p className="text-sm text-amber-600">Bạn chưa đăng mã QR.</p>}
        <button type="button" className="btn btn-primary" disabled={qrBusy} onClick={() => fileRef.current.click()}>
          {qrBusy ? 'Đang tải lên…' : user.qr_url ? 'Đổi mã QR' : 'Đăng mã QR'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadQr} />
      </div>

      <form onSubmit={changePw} className="card p-4 space-y-3">
        <h2 className="font-semibold">Đổi mật khẩu</h2>
        <div><label className="label">Mật khẩu hiện tại</label><input type="password" className="input" autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} required /></div>
        <div><label className="label">Mật khẩu mới</label><input type="password" className="input" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></div>
        <div><label className="label">Nhập lại mật khẩu mới</label><input type="password" className="input" autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} required /></div>
        <button className="btn btn-primary" disabled={pwBusy}>{pwBusy ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
      </form>
    </div>
  );
}
