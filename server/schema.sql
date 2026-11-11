-- Nexura database (Cloudflare D1 / SQLite).
-- Money is whole Rupiah (INTEGER). Times are Unix milliseconds (INTEGER).
-- Nothing here stores a password or a payment credential in readable form.

PRAGMA foreign_keys = ON;

-- Accounts. The password is never stored: only a salted PBKDF2 hash of it.
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',     -- optional: sign-up does not ask for it
  birth       TEXT NOT NULL DEFAULT '',     -- optional, YYYY-MM-DD
  pw_hash     TEXT NOT NULL,
  pw_salt     TEXT NOT NULL,
  pw_iter     INTEGER NOT NULL,
  pw_changed  INTEGER,
  is_admin    INTEGER NOT NULL DEFAULT 0,   -- set by hand in the database, never from the site
  created_at  INTEGER NOT NULL
);

-- Who is signed in. Only a hash of the session token is kept, so a copy of this table
-- cannot be used to sign in as anyone.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS addresses (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,           -- 0 is Utama
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  street      TEXT NOT NULL,
  city        TEXT NOT NULL,
  postal      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS addresses_user ON addresses(user_id, position);

-- Catalogue: the server's own copy of what is for sale and for how much. Orders are priced
-- from these rows, never from numbers the browser sends.
CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  price        INTEGER NOT NULL CHECK (price > 0),
  phone_model  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS variants (
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  id          TEXT NOT NULL,
  label       TEXT NOT NULL,
  price       INTEGER CHECK (price IS NULL OR price > 0),   -- NULL: the product's price
  PRIMARY KEY (product_id, id)
);

-- Units set aside for the website (the marketplaces have their own). One row per variant;
-- variant_id is '' for a product without variants. An order takes its units the moment it is
-- placed and gives them back if it is not paid in time. The CHECK is what stops the last unit
-- being sold twice: a sale that would go below zero fails as a whole.
CREATE TABLE IF NOT EXISTS stock (
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  TEXT NOT NULL DEFAULT '',
  qty         INTEGER NOT NULL CHECK (qty >= 0),
  PRIMARY KEY (product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS couriers (
  id        TEXT PRIMARY KEY,
  label     TEXT NOT NULL,
  price     INTEGER NOT NULL CHECK (price >= 0),
  days_min  INTEGER NOT NULL,
  days_max  INTEGER NOT NULL,
  position  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS promos (
  code   TEXT PRIMARY KEY,                -- stored upper case
  label  TEXT NOT NULL,
  off    INTEGER NOT NULL CHECK (off > 0)
);

-- Small settings: insurance rate, payment window, enabled payment methods.
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL                    -- JSON
);

-- Orders. `holder` is who may see the order: 'u:<user id>' or 'g:<guest id>' (a guest's
-- orders move to their account when they sign in on the same browser).
-- An order becomes 'paid' only when the payment gateway says so, never on the browser's word.
CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  holder        TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'expired', 'cancelled')),
  goods         INTEGER NOT NULL,
  shipping      INTEGER NOT NULL,
  insurance     INTEGER NOT NULL,
  discount      INTEGER NOT NULL,
  total         INTEGER NOT NULL CHECK (total > 0),
  courier_id    TEXT NOT NULL,
  pay_method    TEXT NOT NULL,
  promo_code    TEXT,
  note          TEXT NOT NULL DEFAULT '',
  addr_name     TEXT NOT NULL,
  addr_phone    TEXT NOT NULL,
  addr_street   TEXT NOT NULL,
  addr_city     TEXT NOT NULL,
  addr_postal   TEXT NOT NULL,
  gateway_ref   TEXT,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  paid_at       INTEGER,
  shipped_at    INTEGER,
  tracking_no   TEXT
);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status, expires_at);
CREATE INDEX IF NOT EXISTS orders_holder ON orders(holder, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line         INTEGER NOT NULL,
  product_id   TEXT NOT NULL,
  variant_id   TEXT,
  name         TEXT NOT NULL,             -- as sold, so later catalogue edits don't rewrite history
  variant      TEXT,
  phone_model  TEXT,
  qty          INTEGER NOT NULL CHECK (qty > 0),
  unit_price   INTEGER NOT NULL CHECK (unit_price > 0),
  PRIMARY KEY (order_id, line)
);

-- Sensi Pro Player.
CREATE TABLE IF NOT EXISTS sensi_players (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  role      TEXT NOT NULL,
  image     TEXT NOT NULL,
  settings  TEXT NOT NULL                 -- JSON [[label, value], ...]
);

-- One row per printed pack. The code itself is not stored, only a keyed hash of it, and a
-- code can be claimed once: `holder` is set by the first claim and never changes hands.
CREATE TABLE IF NOT EXISTS sensi_codes (
  code_hash   TEXT PRIMARY KEY,
  player_id   TEXT NOT NULL REFERENCES sensi_players(id),
  batch       TEXT NOT NULL,
  holder      TEXT,
  claimed_at  INTEGER
);
CREATE INDEX IF NOT EXISTS sensi_holder ON sensi_codes(holder);

-- The QR printed on today's packs is the same on every pack, so it cannot be one-time.
-- Opening it needs an account instead, and each account's opened players are kept here.
-- player_id NULL on a shared code means it opens every player.
CREATE TABLE IF NOT EXISTS sensi_shared (
  code_hash  TEXT PRIMARY KEY,
  player_id  TEXT REFERENCES sensi_players(id),
  label      TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sensi_claims (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_id   TEXT NOT NULL REFERENCES sensi_players(id),
  claimed_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, player_id)
);

-- Attempt counter behind the rate limits (sign-in, sign-up, code guessing).
CREATE TABLE IF NOT EXISTS rate_events (
  bucket  TEXT NOT NULL,
  at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_bucket ON rate_events(bucket, at);
