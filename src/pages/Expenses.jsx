import { useEffect, useState } from 'react';
import { api, vnd, fullVnd, cleanK, num, fmtTime, download } from '../api.js';
import { useToast } from '../toast.jsx';
import Confirm from '../components/Confirm.jsx';
import SmartImg from '../components/SmartImg.jsx';

export default function Expenses({ trip, me }) {
  const [expenses, setExpenses] = useState(null);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [del, setDel] = useState(null);
  const toast = useToast();
  const load = () => api.get(`/trips/${trip.id}/expenses`).then((d) => setExpenses(d.expenses));
  useEffect(() => { load(); }, [trip.id, tick]);
  const refresh = () => setTick((t) => t + 1);

  const remove = async () => {
    const e = del; setDel(null);
    try { await api.del(`/trips/${trip.id}/expenses/${e.id}`); toast('Đã xoá khoản chi'); refresh(); } catch (x) { toast(x.message, 'error'); }
  };

  return (
    <div className="space-y-6">
      <Debts tripId={trip.id} me={me} tick={tick} />
      {del && <Confirm title={`Xoá khoản chi "${del.title}"?`} yes="Xoá" no="Không" onYes={remove} onNo={() => setDel(null)} />}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Các khoản chi</h2>
          <button className="btn btn-primary" onClick={() => setOpen(!open)}>{open ? 'Đóng' : '+ Thêm khoản chi'}</button>
        </div>
        {open && <ExpenseForm trip={trip} me={me} onDone={() => { setOpen(false); toast('Đã thêm khoản chi'); refresh(); }} />}
        {expenses === null ? <p className="text-slate-500 text-sm">Đang tải…</p> : expenses.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có khoản chi nào.</p>
        ) : expenses.map((e) => (
          <div key={e.id} className="card p-4">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-slate-500">{e.payer_name} trả · {fmtTime(e.created_at)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{vnd(e.amount)}</div>
                <div className="text-xs text-slate-400">{e.split_type === 'equal' ? 'Chia đều' : 'Chia theo người'}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-600">
              {e.shares.map((s) => <span key={s.user_id}>{s.full_name}: {vnd(s.amount)}</span>)}
            </div>
            {(e.created_by === me.id || e.payer_id === me.id) && (
              <button onClick={() => setDel(e)} className="text-xs text-red-500 mt-2">Xoá</button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function ExpenseForm({ trip, me, onDone }) {
  const members = trip.members;
  const [title, setTitle] = useState('');
  const [payer, setPayer] = useState(me.id);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('equal');
  const [part, setPart] = useState(new Set(members.map((m) => m.id)));
  const [custom, setCustom] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const total = num(amount);
  const sum = members.reduce((s, m) => s + num(custom[m.id]), 0);
  const diff = total - sum;
  const ok = title.trim() && total > 0 && (type === 'equal' ? part.size > 0 : diff === 0);
  const toggle = (id) => { const s = new Set(part); s.has(id) ? s.delete(id) : s.add(id); setPart(s); };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api.post(`/trips/${trip.id}/expenses`, {
        title, payer_id: payer, amount: total, split_type: type, participants: [...part],
        shares: members.map((m) => ({ user_id: m.id, amount: num(custom[m.id]) })),
      });
      onDone();
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="card p-4 space-y-4 border-indigo-200">
      <div><label className="label">Tên khoản chi</label><input className="input" placeholder="VD: Ăn tối" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Người trả tiền</label>
          <select className="input" value={payer} onChange={(e) => setPayer(Number(e.target.value))}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tổng tiền (k)</label>
          <input className="input" inputMode="decimal" placeholder="VD: 300" value={amount} onChange={(e) => setAmount(cleanK(e.target.value))} required />
          {total > 0 && <div className="text-xs text-slate-400 mt-1">{vnd(total)} = {fullVnd(total)}</div>}
        </div>
      </div>

      <div className="flex gap-2">
        {[['equal', 'Chia đều'], ['custom', 'Chia theo từng người']].map(([k, l]) => (
          <button type="button" key={k} onClick={() => setType(k)}
            className={`btn flex-1 ${type === k ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
        ))}
      </div>

      {type === 'equal' ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Chia cho những người được chọn{part.size > 0 && total > 0 ? ` (${vnd(Math.round(total / part.size))}/người)` : ''}:</p>
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={part.has(m.id)} onChange={() => toggle(m.id)} /> {m.full_name}
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm">{m.full_name}</span>
              <input className="input !w-36 text-right" inputMode="decimal" placeholder="0 (k)"
                value={custom[m.id] ?? ''}
                onChange={(e) => setCustom({ ...custom, [m.id]: cleanK(e.target.value) })} />
            </div>
          ))}
          <p className={`text-sm font-medium ${diff === 0 && total > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            Đã chia {vnd(sum)} / {vnd(total)} {diff === 0 && total > 0 ? '✓ khớp' : diff > 0 ? `· còn thiếu ${vnd(diff)}` : `· dư ${vnd(-diff)}`}
          </p>
        </div>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn btn-primary w-full" disabled={!ok || busy}>{busy ? 'Đang lưu…' : 'Lưu khoản chi'}</button>
    </form>
  );
}

function Debts({ tripId, me, tick }) {
  const [debts, setDebts] = useState(null);
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const load = () => api.get(`/trips/${tripId}/debts`).then((d) => setDebts(d.debts));
  useEffect(() => { load(); }, [tripId, tick]);
  // Tự cập nhật để chủ nợ thấy yêu cầu xác nhận ngay khi bạn bè báo chuyển khoản
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load(); }, 15000);
    const v = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', v);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); };
  }, [tripId]);

  const act = async (fn, ok) => { setBusy(true); try { await fn(); await load(); if (ok) toast(ok); } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); } };
  const paid = () => act(async () => { await api.post(`/trips/${tripId}/payments`, { to_user: qr.to }); setQr(null); }, 'Đã báo chuyển khoản, chờ người nhận xác nhận');
  const confirmRecv = (d) => act(() => api.post(`/trips/${tripId}/payments/confirm`, { from_user: d.from }), 'Đã xác nhận nhận tiền');

  if (!debts) return null;
  const mine = debts.filter((d) => d.from === me.id);
  const owedAll = debts.filter((d) => d.to === me.id);
  const owed = owedAll.filter((d) => d.pending > 0); // chỉ hiện khi người nợ đã bấm "Tôi đã chuyển khoản"
  const others = debts.filter((d) => d.from !== me.id && d.to !== me.id);
  const reasons = (d) => { const t = [...new Set(d.details.map((x) => x.title))]; return t.length ? ` (${t.join(', ')})` : ''; };
  const detail = (d) => d.details.length > 1 ? d.details.map((x) => `${x.title} ${vnd(x.amount)}`).join(' + ') : '';

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Công nợ (đã cộng dồn)</h2>
      {debts.length === 0 && <p className="text-sm text-emerald-600">🎉 Không còn khoản nợ nào.</p>}
      {debts.length > 0 && mine.length === 0 && owed.length === 0 && others.length === 0 && (
        <p className="text-sm text-slate-400">Chưa có yêu cầu xác nhận nào.</p>
      )}

      {mine.map((d) => (
        <div key={`${d.from}-${d.to}`} className="card p-4 border-l-4 border-l-rose-400">
          <div className="text-sm">Bạn cần trả <b>{d.to_name}</b>{reasons(d)}</div>
          <div className="text-2xl font-bold text-rose-600">{vnd(d.amount)}</div>
          {detail(d) && <div className="text-xs text-slate-500 mt-1">{detail(d)}</div>}
          {d.pending > 0 && <div className="text-xs text-amber-600 mt-1">⏳ Đã báo chuyển {vnd(d.pending)}, chờ {d.to_name} xác nhận</div>}
          <button className="btn btn-primary mt-3" onClick={() => setQr({ to: d.to, name: d.to_name, amount: d.amount, pending: d.pending, qr: d.to_qr })}>Thanh toán / Xem mã QR</button>
        </div>
      ))}

      {owed.map((d) => (
        <div key={`${d.from}-${d.to}`} className="card p-4 border-l-4 border-l-emerald-400">
          <div className="text-sm"><b>{d.from_name}</b> cần trả bạn{reasons(d)}</div>
          <div className="text-2xl font-bold text-emerald-600">{vnd(d.amount)}</div>
          {detail(d) && <div className="text-xs text-slate-500 mt-1">{detail(d)}</div>}
          <div className="text-xs text-amber-600 mt-1">⏳ {d.from_name} báo đã chuyển {vnd(d.pending)} — hãy kiểm tra tài khoản</div>
          <button className="btn btn-green mt-3" disabled={busy} onClick={() => confirmRecv(d)}>
            ✓ Xác nhận đã nhận {vnd(d.pending)}
          </button>
        </div>
      ))}

      {others.length > 0 && (
        <div className="text-sm text-slate-500 space-y-1">
          <div className="font-medium">Các khoản khác trong nhóm:</div>
          {others.map((d) => <div key={`${d.from}-${d.to}`}>{d.from_name} → {d.to_name}: {vnd(d.amount)}</div>)}
        </div>
      )}

      {qr && (
        <div className="fixed inset-0 z-20 bg-black/60 flex items-center justify-center p-4" onClick={() => setQr(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm text-slate-500">Chuyển khoản cho</div>
            <div className="text-lg font-bold">{qr.name}</div>
            <div>
              <div className="text-2xl font-bold text-indigo-600">{vnd(qr.amount - qr.pending > 0 ? qr.amount - qr.pending : qr.amount)}</div>
              <div className="text-sm text-slate-500">= {fullVnd(qr.amount - qr.pending > 0 ? qr.amount - qr.pending : qr.amount)}</div>
            </div>
            {qr.qr ? <SmartImg src={qr.qr} alt="QR" className="mx-auto max-h-80 rounded-lg border" /> : (
              <p className="text-sm text-amber-600 py-6">{qr.name} chưa tải mã QR lên hồ sơ. Hãy nhắn bạn ấy bổ sung nhé.</p>
            )}
            {qr.qr && <button type="button" className="btn btn-ghost w-full" onClick={() => download(qr.qr)}>⬇ Lưu mã QR về máy</button>}
            <button className="btn btn-green w-full" disabled={busy || qr.pending >= qr.amount} onClick={paid}>
              {qr.pending >= qr.amount ? 'Đang chờ xác nhận' : 'Tôi đã chuyển khoản'}
            </button>
            <button className="btn btn-ghost w-full" onClick={() => setQr(null)}>Đóng</button>
          </div>
        </div>
      )}
    </section>
  );
}