import 'dotenv/config';
import pg from 'pg';

// BIGINT -> number, DATE -> chuỗi 'YYYY-MM-DD' (tránh lệch múi giờ)
pg.types.setTypeParser(20, (v) => Number(v));
pg.types.setTypeParser(1082, (v) => v);

const url = process.env.DATABASE_URL;
if (!url) console.warn('⚠️  Chưa đặt DATABASE_URL');

export const pool = new pg.Pool({
  connectionString: url,
  ssl: url && /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});
export const q = (text, params) => pool.query(text, params);
