import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function NewTrip() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/users').then((d) => setUsers(d.users.filter((u) => u.id !== user.id))); }, [user.id]);
  const previews = useMemo(() => files.map((f) => ({ url: URL.createObjectURL(f), video: f.type.startsWith('video/') })), [files]);
  const toggle = (id) => { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s); };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name); fd.append('trip_date', date); fd.append('description', desc);
      fd.append('members', JSON.stringify([...sel]));
      files.forEach((f) => fd.append('media', f));
      const d = await api.post('/trips', fd);
      nav(`/trips/${d.id}`);
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <h1 className="text-xl font-bold">Add Memories</h1>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">1. Những ai đã đi cùng?</h2>
        <p className="text-sm text-slate-500">Bạn mặc định tham gia. Chọn thêm bạn bè từ danh sách tài khoản:</p>
        <div className="flex flex-wrap gap-2">
          {users.length === 0 && <span className="text-sm text-slate-400">Chưa có tài khoản nào khác.</span>}
          {users.map((u) => (
            <button type="button" key={u.id} onClick={() => toggle(u.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${sel.has(u.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
              {sel.has(u.id) ? '✓ ' : ''}{u.full_name}
            </button>
          ))}
        </div>
      </section>

      <section className={`card p-4 space-y-3 ${sel.size === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="font-semibold">2. Thông tin chuyến đi</h2>
        {sel.size === 0 && <p className="text-sm text-amber-600">Hãy chọn thành viên trước.</p>}
        <div><label className="label">Tên chuyến đi</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><label className="label">Ngày đi</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div><label className="label">Mô tả</label><textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div>
          <label className="label">Hình ảnh / video (tối đa 20 file, mỗi file ≤ 50MB)</label>
          <input type="file" accept="image/*,video/*" multiple onChange={(e) => setFiles([...e.target.files].slice(0, 20))}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-indigo-700" />
          {previews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {previews.map((p, i) => p.video
                ? <video key={i} src={p.url} className="aspect-square object-cover rounded-lg bg-black" muted />
                : <img key={i} src={p.url} alt="" className="aspect-square object-cover rounded-lg" />)}
            </div>
          )}
        </div>
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy || sel.size === 0}>{busy ? 'Đang tải lên… (có thể mất vài phút)' : 'Lưu kỷ niệm'}</button>
    </form>
  );
}
