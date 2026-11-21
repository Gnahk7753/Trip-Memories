-- Schema cho Neon PostgreSQL (idempotent: chạy lại nhiều lần vẫn an toàn)
-- Số tiền lưu bằng BIGINT (đơn vị VND, không có phần thập phân)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  qr_url        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  trip_date   DATE NOT NULL,
  description TEXT,
  cover_url   TEXT,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_members (
  trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS trip_media (
  id          SERIAL PRIMARY KEY,
  trip_id     INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  media_type  VARCHAR(10) NOT NULL CHECK (media_type IN ('image','video')),
  uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  trip_id    INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id         SERIAL PRIMARY KEY,
  trip_id    INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title      VARCHAR(150) NOT NULL,
  payer_id   INT NOT NULL REFERENCES users(id),
  amount     BIGINT NOT NULL CHECK (amount > 0),
  split_type VARCHAR(10) NOT NULL CHECK (split_type IN ('equal','custom')),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phần phải chịu của từng người trong một khoản chi
CREATE TABLE IF NOT EXISTS expense_shares (
  expense_id INT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id),
  amount     BIGINT NOT NULL CHECK (amount >= 0),
  PRIMARY KEY (expense_id, user_id)
);

-- Thanh toán công nợ: người nợ báo "đã chuyển" (pending) -> chủ nợ xác nhận (confirmed)
CREATE TABLE IF NOT EXISTS payments (
  id           SERIAL PRIMARY KEY,
  trip_id      INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user    INT NOT NULL REFERENCES users(id),
  to_user      INT NOT NULL REFERENCES users(id),
  amount       BIGINT NOT NULL CHECK (amount > 0),
  status       VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trips_date     ON trips(trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_members_user   ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_media_trip     ON trip_media(trip_id);
CREATE INDEX IF NOT EXISTS idx_comments_trip  ON comments(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip  ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_payments_trip  ON payments(trip_id);
