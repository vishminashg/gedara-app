import Database from 'better-sqlite3';

export const SLOT_LABELS = ['9:00 am', '11:00 am', '2:00 pm', '4:00 pm'];

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('customer','provider','admin')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS providers (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  trade TEXT NOT NULL CHECK (trade IN ('plumbing','electrical','cleaning')),
  area TEXT NOT NULL,
  years INTEGER NOT NULL DEFAULT 0,
  bio TEXT NOT NULL DEFAULT '',
  price_from INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  accepting INTEGER NOT NULL DEFAULT 1,
  listed INTEGER NOT NULL DEFAULT 1,
  rating_seed REAL NOT NULL DEFAULT 0,
  count_seed INTEGER NOT NULL DEFAULT 0,
  checks TEXT NOT NULL DEFAULT '[0,0,0,0]',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(user_id) ON DELETE CASCADE,
  job TEXT NOT NULL, min_price INTEGER NOT NULL, max_price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS work_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL, filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','accepted','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(user_id) ON DELETE CASCADE,
  dow INTEGER NOT NULL CHECK (dow BETWEEN 1 AND 7),
  slot INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 3),
  UNIQUE (provider_id, dow, slot)
);

CREATE TABLE IF NOT EXISTS favourites (
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES providers(user_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (customer_id, provider_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  provider_id INTEGER NOT NULL REFERENCES providers(user_id),
  job TEXT NOT NULL DEFAULT '',
  problem TEXT NOT NULL DEFAULT '',
  photos INTEGER NOT NULL DEFAULT 0,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  date TEXT,
  slot INTEGER,
  pay TEXT NOT NULL DEFAULT 'Cash',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','accepted','declined','completed','cancelled')),
  quote INTEGER,
  price INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id, date, slot);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  provider_id INTEGER NOT NULL REFERENCES providers(user_id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags TEXT NOT NULL DEFAULT '[]',
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  provider_id INTEGER NOT NULL REFERENCES providers(user_id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Medium' CHECK (severity IN ('Low','Medium','High')),
  detail TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New','In review','Resolved','Dismissed')),
  outcome TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS complaint_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(user_id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','paid')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(file = ':memory:') {
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}

export function notify(db, userId, text) {
  db.prepare('INSERT INTO notifications (user_id, text) VALUES (?, ?)').run(userId, text);
}

/* ---------- date and slot helpers ---------- */
export function isoDate(offsetDays = 0, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
/** ISO weekday: Monday = 1 ... Sunday = 7 */
export function isoDow(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const js = new Date(y, m - 1, d).getDay();
  return js === 0 ? 7 : js;
}
export function dayLabel(dateStr, today = isoDate(0)) {
  if (dateStr === today) return 'Today';
  if (dateStr === isoDate(1)) return 'Tomorrow';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Start hour of each slot (same order as SLOT_LABELS). */
export const SLOT_HOURS = [9, 11, 14, 16];
/**
 * True when the slot's start time has already gone by today. Turned off with HIDE_PAST_SLOTS=0
 * (the automated tests use fixed seed data and must not depend on the time of day).
 */
export function slotPassed(date, slot, now = new Date()) {
  if (process.env.HIDE_PAST_SLOTS === '0') return false;
  return date === isoDate(0, now) && now.getHours() >= SLOT_HOURS[slot];
}

/** A slot is free when no pending/accepted booking holds it and the provider has not blocked that weekday/slot. */
export function slotIsFree(db, providerId, date, slot, ignoreBookingId = 0, { checkPast = false } = {}) {
  if (checkPast && slotPassed(date, slot)) return false;
  const taken = db.prepare(
    `SELECT 1 FROM bookings WHERE provider_id = ? AND date = ? AND slot = ?
     AND status IN ('pending','accepted') AND id != ? LIMIT 1`
  ).get(providerId, date, slot, ignoreBookingId);
  if (taken) return false;
  const blocked = db.prepare('SELECT 1 FROM blocks WHERE provider_id = ? AND dow = ? AND slot = ?')
    .get(providerId, isoDow(date), slot);
  return !blocked;
}

export function nextFree(db, providerId, days = 7) {
  for (let d = 0; d < days; d++) {
    const date = isoDate(d);
    for (let s = 0; s < 4; s++) {
      if (slotIsFree(db, providerId, date, s, 0, { checkPast: true })) {
        return { date, slot: s, label: `${dayLabel(date)} ${SLOT_LABELS[s]}` };
      }
    }
  }
  return null;
}
