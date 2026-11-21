import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, fmtDate, fmtTime } from '../api.js';
import { useAuth } from '../auth.jsx';
import Expenses from './Expenses.jsx';

export default function Trip() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('memories');
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const load = () => api.get(`/trips/${id}`).then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  if (err) return <div className="card p-6 text-red-600">{err} <Link className="underline" to="/">Về trang chủ</Link></div>;
  if (!data) return <p className="text-slate-500">Đang tải…</p>;
  const { trip, members, media, comments } = data;

  const addMedia = async (e) => {
    const files = [...e.target.files]; if (!files.length) return;
    setBusy(true);
    try {
      const fd = new FormData(); files.slice(0, 20).forEach((f) => fd.append('media', f));
      await api.post(`/trips/${id}/media`, fd); await load();
    } catch (x) { alert(x.message); } finally { setBusy(false); e.target.value = ''; }
  };
  const send = async (e) => {
    e.preventDefault(); if (!text.trim()) return;
    try { await api.post(`/trips/${id}/comments`, { content: text }); setText(''); await load(); } catch (x) { alert(x.message); }
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Hình ảnh & video ({media.length})</h2>
              <button className="btn btn-ghost" onClick={() => fileRef.current.click()} disabled={busy}>{busy ? 'Đang tải…' : '+ Thêm'}</button>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={addMedia} />
            </div>
            {media.length === 0 ? <p className="text-sm text-slate-400">Chưa có hình ảnh nào.</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {media.map((m) => m.media_type === 'video'
                  ? <video key={m.id} src={m.url} controls preload="metadata" className="w-full aspect-square object-cover rounded-xl bg-black" />
                  : <a key={m.id} href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt="" loading="lazy" className="w-full aspect-square object-cover rounded-xl" /></a>)}
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
    </div>
  );
}
