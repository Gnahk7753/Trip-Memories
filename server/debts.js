import { q } from './db.js';

/**
 * Tính công nợ của một chuyến đi.
 * - Mỗi phần chia của người KHÔNG phải người trả => "người đó nợ người trả".
 * - Gộp tất cả khoản cùng chiều giữa 2 người thành 1 số (100k + 50k = 150k); nếu có nợ ngược chiều thì bù trừ.
 * - Trừ các thanh toán đã được chủ nợ xác nhận (confirmed).
 * - pending = số tiền con nợ đã báo chuyển nhưng chủ nợ chưa xác nhận.
 */
export async function computeDebts(tripId) {
  const { rows: shares } = await q(
    `SELECT e.id AS expense_id, e.title, e.payer_id, s.user_id, s.amount
       FROM expense_shares s JOIN expenses e ON e.id = s.expense_id
      WHERE e.trip_id = $1 AND s.user_id <> e.payer_id AND s.amount > 0
      ORDER BY e.created_at`,
    [tripId]
  );
  const { rows: pays } = await q(
    'SELECT from_user, to_user, amount, status FROM payments WHERE trip_id = $1',
    [tripId]
  );

  const net = new Map(); // key "x:y" (x<y): giá trị > 0 nghĩa là x nợ y
  const add = (a, b, amt) => {
    const [x, y, sign] = a < b ? [a, b, 1] : [b, a, -1];
    const k = `${x}:${y}`;
    net.set(k, (net.get(k) || 0) + sign * amt);
  };
  shares.forEach((s) => add(s.user_id, s.payer_id, s.amount));
  pays.filter((p) => p.status === 'confirmed').forEach((p) => add(p.from_user, p.to_user, -p.amount));

  const out = [];
  for (const [k, v] of net) {
    if (v === 0) continue;
    const [x, y] = k.split(':').map(Number);
    const [from, to] = v > 0 ? [x, y] : [y, x];
    const amount = Math.abs(v);
    const pending = pays
      .filter((p) => p.status === 'pending' && p.from_user === from && p.to_user === to)
      .reduce((s, p) => s + p.amount, 0);
    const details = shares
      .filter((s) => s.user_id === from && s.payer_id === to)
      .map((s) => ({ title: s.title, amount: s.amount }));
    out.push({ from, to, amount, pending, details });
  }
  return out;
}
