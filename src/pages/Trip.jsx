import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, fmtDate, fmtTime, download, uploadMedia } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';
import SmartImg from '../components/SmartImg.jsx';
import Lightbox from '../components/Lightbox.jsx';
import Confirm from '../components/Confirm.jsx';
import Expenses from './Expenses.jsx';

export default function Trip() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('memories');
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(null);
  const [lb, setLb] = useState(null);
  const fileRef = useRef();
  const nav = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [delAsk, setDelAsk] = useState(false);

  useEffect(() => { api.get(`/trips/${id}`).then(setData).catch((e) => setErr(e.message)); }, [id]);

  if (err) return <div className="card p-6 text-red-600">{err} <Link className="underline" to="/">Về trang chủ</Link></div>;
  if (!data) return <p className="text-slate-500">Đang tải…</p>;
  const { trip, members, media, comments } = data;

  const addMedia = async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const r = await uploadMedia(id, files, (a, b) => setProg({ a, b }), (added) => setData((p) => ({ ...p, media: [...p.media, ...added] })));
      const ok = r.total - r.failed.length;
      if (ok) toast(`Đã thêm ${ok} file`);
      if (r.failed.length) toast(`${r.failed.length} file tải lên thất bại (quá 50MB hoặc lỗi mạng): ${r.failed.slice(0, 3).join(', ')}${r.failed.length > 3 ? '…' : ''}`, 'error');
    } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); setProg(null); }
  };
  const send = async (e) => {
    e.preventDefault(); if (!text.trim()) return;
    try {
      const d = await api.post(`/trips/${id}/comments`, { content: text });
      setData((p) => ({ ...p, comments: [...p.comments, d.comment] })); setText('');
    } catch (x) { toast(x.message, 'error'); }
  };
  const addMembers = async (user_ids) => {
    try {
      const d = await api.post(`/trips/${id}/members`, { user_ids });
      setData((p) => ({ ...p, members: d.members }));
      setAddOpen(false);
      toast(`Đã thêm ${user_ids.length} người vào chuyến đi`);
    } catch (x) { toast(x.message, 'error'); }
  };
  const removeTrip = async () => {
    setDelAsk(false);
    try { await api.del(`/trips/${id}`); toast('Đã xoá kỷ niệm'); nav('/'); } catch (x) { toast(x.message, 'error'); }
  };
  const downloadAll = () => {
    toast(`Đang tải ${media.length} file… (nếu trình duyệt hỏi, hãy cho phép tải nhiều file)`);
    media.forEach((m, i) => setTimeout(() => download(m.url), i * 700));
  };

  return (
    <div className="space-y-5">
      <Link to="/" className="text-sm text-indigo-600">← Dòng thời gian</Link>
      <div>
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        <p className="text-sm text-slate-500">{fmtDate(trip.trip_date)}</p>
        {trip.description && <p className="mt-2 text-sm">{trip.description}</p>}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {members.map((m) => <span key={m.id} className="text-xs bg-slate-100 rounded-full px-2.5 py-1">{m.full_name}</span>)}
          <button type="button" onClick={() => setAddOpen(true)} className="text-xs rounded-full px-2.5 py-1 border border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50">+ Thêm bạn</button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {[['memories', 'Kỷ niệm'], ['expenses', 'Chi phí chuyến đi']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>{l}</button>
        ))}
      </div>

      {tab === 'memories' ? (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Hình ảnh & video ({media.length})</h2>
              <div className="flex gap-2">
                {media.length > 0 && <button className="btn btn-ghost" onClick={downloadAll}>⬇ Tải tất cả</button>}
                <button className="btn btn-ghost" onClick={() => fileRef.current.click()} disabled={busy}>{busy ? (prog ? `Đang tải ${prog.a}/${prog.b}…` : 'Đang tải…') : '+ Thêm'}</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={addMedia} />
            </div>
            {media.length === 0 ? <p className="text-sm text-slate-400">Chưa có hình ảnh nào.</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {media.map((m, i) => (
                  <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-200">
                    <button type="button" onClick={() => setLb(i)} className="block w-full h-full">
                      {m.media_type === 'video' ? (
                        <>
                          <video src={`${m.url}#t=0.1`} preload="metadata" muted playsInline className="w-full h-full object-cover bg-black" />
                          <span className="absolute inset-0 flex items-center justify-center text-white text-4xl drop-shadow">▶</span>
                        </>
                      ) : <SmartImg src={m.url} loading="lazy" className="w-full h-full object-cover" />}
                    </button>
                    <button type="button" title="Lưu về máy" onClick={() => download(m.url)}
                      className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-black/55 text-white text-sm hover:bg-black/75">⬇</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Bình luận ({comments.length})</h2>
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="card px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-sm">{c.full_name}</span>
                    <span className="text-xs text-slate-400">{fmtTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex gap-2">
              <input className="input" placeholder="Viết bình luận…" value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn btn-primary">Gửi</button>
            </form>
          </section>
        </>
      ) : (
        <Expenses trip={{ id: trip.id, members }} me={user} />
      )}

      {trip.created_by === user.id && (
        <div className="pt-6 mt-6 border-t text-center">
          <button type="button" onClick={() => setDelAsk(true)} className="text-sm text-rose-600 hover:underline">🗑 Xoá kỷ niệm này</button>
        </div>
      )}

      {lb !== null && <Lightbox items={media} index={lb} onClose={() => setLb(null)} onIndex={setLb} />}
      {addOpen && <AddMembers members={members} onClose={() => setAddOpen(false)} onAdd={addMembers} />}
      {delAsk && (
        <Confirm title={`Xoá kỷ niệm "${trip.name}"?`} message="Toàn bộ ảnh, video, bình luận và chi phí của chuyến đi sẽ bị xoá vĩnh viễn."
          yes="Xoá" no="Không" onYes={removeTrip} onNo={() => setDelAsk(false)} />
      )}
    </div>
  );
}

function AddMembers({ members, onClose, onAdd }) {
  const [users, setUsers] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get('/users').then((d) => setUsers(d.users.filter((u) => !members.some((m) => m.id === u.id))));
  }, []);
  const toggle = (uid) => { const s = new Set(sel); s.has(uid) ? s.delete(uid) : s.add(uid); setSel(s); };
  const submit = async () => { setBusy(true); await onAdd([...sel]); setBusy(false); };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg">Thêm bạn vào chuyến đi</h3>
        {users === null ? <p className="text-sm text-slate-500">Đang tải…</p> : users.length === 0 ? (
          <p className="text-sm text-slate-500">Tất cả tài khoản trong hệ thống đã có trong chuyến đi này.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {users.map((u) => (
              <button type="button" key={u.id} onClick={() => toggle(u.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${sel.has(u.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                {sel.has(u.id) ? '✓ ' : ''}{u.full_name}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary flex-1" disabled={!sel.size || busy} onClick={submit}>{busy ? 'Đang thêm…' : `Thêm${sel.size ? ` (${sel.size})` : ''}`}</button>
        </div>
      </div>
    </div>
  );
}
