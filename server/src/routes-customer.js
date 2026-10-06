import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, signToken } from './auth.js';
import { HttpError, notFound, parse, wrap, z } from './http.js';
import { notify, slotIsFree, isoDate, dayLabel, SLOT_LABELS } from './db.js';
import { listProviders, providerProfile, slotGrid } from './provider-view.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

export function publicRoutes(db) {
  const r = Router();

  r.get('/health', wrap(() => ({ ok: true })));

  r.post('/auth/register', wrap((req, res) => {
    const b = parse(z.object({
      role: z.enum(['customer', 'provider']),
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(6, 'must be at least 6 characters').max(100),
      phone: z.string().trim().max(30).optional(),
      address: z.string().trim().max(200).optional(),
      trade: z.enum(['plumbing', 'electrical', 'cleaning']).optional(),
      area: z.string().trim().max(60).optional()
    }), req.body);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(b.email)) throw new HttpError(409, 'That email is already registered.');
    if (b.role === 'provider' && !b.trade) throw new HttpError(400, 'trade: choose plumbing, electrical or cleaning');
    const hash = bcrypt.hashSync(b.password, 8);
    const id = db.transaction(() => {
      const uid = db.prepare('INSERT INTO users (role, name, email, phone, address, password_hash) VALUES (?,?,?,?,?,?)')
        .run(b.role, b.name, b.email, b.phone || '', b.address || '', hash).lastInsertRowid;
      if (b.role === 'provider') {
        db.prepare("INSERT INTO providers (user_id, trade, area, listed, status) VALUES (?,?,?,0,'pending')")
          .run(uid, b.trade, b.area || 'Colombo');
      }
      return Number(uid);
    })();
    const user = db.prepare('SELECT id, role, name, email, phone, address FROM users WHERE id = ?').get(id);
    res.status(201);
    return { token: signToken(user), user };
  }));

  r.post('/auth/login', wrap((req) => {
    const b = parse(z.object({ email: z.string().trim().toLowerCase(), password: z.string() }), req.body);
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(b.email);
    if (!row || !bcrypt.compareSync(b.password, row.password_hash)) throw new HttpError(401, 'Email or password is incorrect.');
    const user = { id: row.id, role: row.role, name: row.name, email: row.email, phone: row.phone, address: row.address };
    return { token: signToken(user), user };
  }));
  return r;
}

export function accountRoutes(db) {
  const r = Router();
  r.use(requireAuth());

  r.get('/me', wrap((req) => db.prepare('SELECT id, role, name, email, phone, address FROM users WHERE id = ?').get(req.user.id)));
  r.patch('/me', wrap((req) => {
    const b = parse(z.object({ name: z.string().trim().min(2).max(80).optional(), phone: z.string().trim().max(30).optional(), address: z.string().trim().max(200).optional() }), req.body);
    const cur = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    db.prepare('UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?').run(b.name ?? cur.name, b.phone ?? cur.phone, b.address ?? cur.address, req.user.id);
    return db.prepare('SELECT id, role, name, email, phone, address FROM users WHERE id = ?').get(req.user.id);
  }));

  r.get('/notifications', wrap((req) => {
    const items = db.prepare('SELECT id, text, read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30').all(req.user.id);
    return { unread: items.filter(i => !i.read).length, items: items.map(i => ({ ...i, read: !!i.read })) };
  }));
  r.post('/notifications/read-all', wrap((req) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
    return { ok: true };
  }));
  r.delete('/notifications/:id', wrap((req) => {
    const n = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (!n.changes) throw notFound('Notification');
    return { ok: true };
  }));

  /* ---------- chat (shared by customer and provider) ---------- */
  const bookingFor = (id, user) => {
    const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!b || (b.customer_id !== user.id && b.provider_id !== user.id)) throw notFound('Booking');
    return b;
  };
  r.get('/bookings/:id/messages', wrap((req) => {
    bookingFor(req.params.id, req.user);
    return db.prepare(`SELECT m.id, m.sender_id AS senderId, m.body, m.created_at AS createdAt, u.name AS sender
      FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.booking_id = ? ORDER BY m.id`).all(req.params.id);
  }));
  r.post('/bookings/:id/messages', wrap((req, res) => {
    const b = bookingFor(req.params.id, req.user);
    const { body } = parse(z.object({ body: z.string().trim().min(1, 'type a message').max(500) }), req.body);
    if (['cancelled', 'declined'].includes(b.status)) throw new HttpError(409, 'This booking is closed, so chat is switched off.');
    const id = db.prepare('INSERT INTO messages (booking_id, sender_id, body) VALUES (?,?,?)').run(b.id, req.user.id, body).lastInsertRowid;
    const other = req.user.id === b.customer_id ? b.provider_id : b.customer_id;
    notify(db, other, 'New message about "' + (b.job || 'your booking') + '"');
    res.status(201);
    return db.prepare('SELECT id, sender_id AS senderId, body, created_at AS createdAt FROM messages WHERE id = ?').get(id);
  }));
  r.delete('/messages/:id', wrap((req) => {
    const m = db.prepare('DELETE FROM messages WHERE id = ? AND sender_id = ?').run(req.params.id, req.user.id);
    if (!m.changes) throw notFound('Message');
    return { ok: true };
  }));
  return r;
}

export function customerRoutes(db) {
  const r = Router();
  r.use(['/providers', '/favourites', '/bookings', '/reviews', '/complaints'], requireAuth(['customer']));
  const me = req => req.user.id;

  /* ---------- C1/C2/C3: browse ---------- */
  r.get('/providers', wrap((req) => {
    const q = parse(z.object({
      q: z.string().max(80).optional(), svc: z.enum(['plumbing', 'electrical', 'cleaning']).optional(),
      verified: z.enum(['1', '0']).optional(), min: z.coerce.number().min(0).max(5).optional(), today: z.enum(['1', '0']).optional()
    }), req.query);
    return listProviders(db, { q: q.q, svc: q.svc, verified: q.verified === '1', minRating: q.min, today: q.today === '1' }, me(req));
  }));
  r.get('/providers/:id', wrap((req) => {
    const p = providerProfile(db, Number(req.params.id), me(req));
    if (!p) throw notFound('Provider');
    return p;
  }));
  r.get('/providers/:id/slots', wrap((req) => {
    if (!providerProfile(db, Number(req.params.id), me(req))) throw notFound('Provider');
    return slotGrid(db, Number(req.params.id));
  }));

  /* favourites: Create + Delete + Read */
  r.get('/favourites', wrap((req) => listProviders(db, {}, me(req)).filter(p => p.favourite)));
  r.post('/favourites/:pid', wrap((req, res) => {
    if (!providerProfile(db, Number(req.params.pid), me(req))) throw notFound('Provider');
    db.prepare('INSERT OR IGNORE INTO favourites (customer_id, provider_id) VALUES (?,?)').run(me(req), req.params.pid);
    res.status(201);
    return { ok: true };
  }));
  r.delete('/favourites/:pid', wrap((req) => {
    db.prepare('DELETE FROM favourites WHERE customer_id = ? AND provider_id = ?').run(me(req), req.params.pid);
    return { ok: true };
  }));

  /* ---------- C4/C5/C6/C8: bookings ---------- */
  const view = (b) => b && ({
    id: b.id, providerId: b.provider_id, provider: b.provider, trade: b.trade, job: b.job, problem: b.problem,
    photos: b.photos, address: b.address, phone: b.phone, date: b.date, slot: b.slot,
    when: b.date && b.slot !== null ? `${dayLabel(b.date)} ${SLOT_LABELS[b.slot]}` : null,
    pay: b.pay, status: b.status, quote: b.quote, price: b.price, createdAt: b.created_at,
    review: b.review_id ? { id: b.review_id, rating: b.review_rating } : null,
    // NFR3: the provider's phone number is released only once the provider has accepted
    providerPhone: ['accepted', 'completed'].includes(b.status) ? b.provider_phone : null
  });
  const SELECT = `SELECT b.*, u.name AS provider, u.phone AS provider_phone, p.trade, rv.id AS review_id, rv.rating AS review_rating
    FROM bookings b JOIN users u ON u.id = b.provider_id JOIN providers p ON p.user_id = b.provider_id
    LEFT JOIN reviews rv ON rv.booking_id = b.id`;
  const mine = (req) => {
    const b = db.prepare(`${SELECT} WHERE b.id = ? AND b.customer_id = ?`).get(req.params.id, me(req));
    if (!b) throw notFound('Booking');
    return b;
  };

  r.get('/bookings', wrap((req) => {
    const { tab } = parse(z.object({ tab: z.enum(['upcoming', 'past', 'all']).default('all') }), req.query);
    const where = tab === 'upcoming' ? "AND b.status IN ('draft','pending','accepted')"
      : tab === 'past' ? "AND b.status IN ('completed','cancelled','declined')" : '';
    return db.prepare(`${SELECT} WHERE b.customer_id = ? ${where} ORDER BY b.updated_at DESC, b.id DESC`).all(me(req)).map(view);
  }));
  r.get('/bookings/:id', wrap((req) => view(mine(req))));

  const bookingFields = z.object({
    job: z.string().trim().max(80).optional(), problem: z.string().trim().max(600).optional(),
    photos: z.number().int().min(0).max(5).optional(), address: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(30).optional(), pay: z.enum(['Cash', 'Card', 'Bank transfer']).optional(),
    date: dateStr.optional(), slot: z.number().int().min(0).max(3).optional()
  });

  r.post('/bookings', wrap((req, res) => {
    const b = parse(bookingFields.extend({ providerId: z.number().int() }), req.body);
    if (!providerProfile(db, b.providerId, me(req))) throw notFound('Provider');
    const user = db.prepare('SELECT address, phone FROM users WHERE id = ?').get(me(req));
    const id = db.prepare(`INSERT INTO bookings (customer_id, provider_id, job, problem, photos, address, phone, pay, date, slot)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(me(req), b.providerId, b.job || '', b.problem || '', b.photos || 0,
      b.address ?? user.address ?? '', b.phone ?? user.phone ?? '', b.pay || 'Cash', b.date ?? null, b.slot ?? null).lastInsertRowid;
    res.status(201);
    return view(db.prepare(`${SELECT} WHERE b.id = ?`).get(id));
  }));

  r.patch('/bookings/:id', wrap((req) => {
    const cur = mine(req);
    if (['completed', 'cancelled', 'declined'].includes(cur.status)) throw new HttpError(409, 'This booking is closed and cannot be changed.');
    const b = parse(bookingFields, req.body);
    const next = { ...cur, ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)) };
    let status = cur.status;
    const timeChanged = (b.date !== undefined && b.date !== cur.date) || (b.slot !== undefined && b.slot !== cur.slot);
    if (timeChanged && next.date && next.slot !== null) {
      if (next.date < isoDate(0)) throw new HttpError(400, 'date: choose today or a later day');
      if (['pending', 'accepted'].includes(cur.status)) {
        if (!slotIsFree(db, cur.provider_id, next.date, next.slot, cur.id, { checkPast: true })) throw new HttpError(409, 'That time is no longer free. Please pick another slot.');
        // A changed time must be confirmed again by the provider (double-booking and trust rule)
        if (cur.status === 'accepted') {
          status = 'pending';
          notify(db, cur.provider_id, `A customer changed the time of "${cur.job || 'a booking'}" to ${dayLabel(next.date)} ${SLOT_LABELS[next.slot]}. Please confirm it again.`);
        }
      }
    }
    db.prepare(`UPDATE bookings SET job=?, problem=?, photos=?, address=?, phone=?, pay=?, date=?, slot=?, status=?, updated_at=datetime('now') WHERE id=?`)
      .run(next.job, next.problem, next.photos, next.address, next.phone, next.pay, next.date, next.slot, status, cur.id);
    return view(mine(req));
  }));

  r.post('/bookings/:id/submit', wrap((req) => {
    const cur = mine(req);
    if (cur.status !== 'draft') throw new HttpError(409, 'This request was already sent.');
    if ((cur.problem || '').trim().length < 5) throw new HttpError(400, 'problem: describe the problem in a few words');
    if (!cur.date || cur.slot === null) throw new HttpError(400, 'slot: choose a day and time');
    if (cur.date < isoDate(0)) throw new HttpError(400, 'date: choose today or a later day');
    if (!cur.address) throw new HttpError(400, 'address: add the address for the visit');
    if (!slotIsFree(db, cur.provider_id, cur.date, cur.slot, cur.id, { checkPast: true })) throw new HttpError(409, 'That time was just taken. Please pick another slot.');
    db.prepare("UPDATE bookings SET status='pending', updated_at=datetime('now') WHERE id=?").run(cur.id);
    notify(db, cur.provider_id, `New request: ${cur.job || 'job'} (${cur.date})`);
    return view(mine(req));
  }));

  r.post('/bookings/:id/cancel', wrap((req) => {
    const cur = mine(req);
    if (!['pending', 'accepted'].includes(cur.status)) throw new HttpError(409, 'Only waiting or accepted bookings can be cancelled.');
    db.prepare("UPDATE bookings SET status='cancelled', updated_at=datetime('now') WHERE id=?").run(cur.id);
    notify(db, cur.provider_id, `A customer cancelled "${cur.job || 'a booking'}"`);
    return view(mine(req));
  }));

  r.delete('/bookings/:id', wrap((req) => {
    const cur = mine(req);
    if (!['draft', 'cancelled', 'declined'].includes(cur.status)) throw new HttpError(409, 'Only drafts and closed requests can be removed.');
    db.prepare('DELETE FROM bookings WHERE id = ?').run(cur.id);
    return { ok: true };
  }));

  r.post('/bookings/:id/rebook', wrap((req, res) => {
    const cur = mine(req);
    if (cur.status !== 'completed') throw new HttpError(409, 'You can only book again after a finished job.');
    const id = db.prepare(`INSERT INTO bookings (customer_id, provider_id, job, address, phone, pay) VALUES (?,?,?,?,?,?)`)
      .run(me(req), cur.provider_id, cur.job, cur.address, cur.phone, cur.pay).lastInsertRowid;
    res.status(201);
    return view(db.prepare(`${SELECT} WHERE b.id = ?`).get(id));
  }));

  /* ---------- C9: reviews and complaints ---------- */
  const reviewBody = z.object({
    rating: z.number().int().min(1).max(5), tags: z.array(z.string().max(30)).max(6).default([]), body: z.string().trim().max(500).default('')
  });
  r.post('/reviews', wrap((req, res) => {
    const b = parse(reviewBody.extend({ bookingId: z.number().int() }), req.body);
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ? AND customer_id = ?').get(b.bookingId, me(req));
    if (!bk) throw notFound('Booking');
    if (bk.status !== 'completed') throw new HttpError(409, 'You can only review a job that is finished.');
    if (db.prepare('SELECT 1 FROM reviews WHERE booking_id = ?').get(bk.id)) throw new HttpError(409, 'You already reviewed this job. Edit your review instead.');
    const id = db.prepare('INSERT INTO reviews (booking_id, customer_id, provider_id, rating, tags, body) VALUES (?,?,?,?,?,?)')
      .run(bk.id, me(req), bk.provider_id, b.rating, JSON.stringify(b.tags), b.body).lastInsertRowid;
    notify(db, bk.provider_id, `You received a ${b.rating}-star review`);
    res.status(201);
    return { id: Number(id), ...b };
  }));
  r.patch('/reviews/:id', wrap((req) => {
    const cur = db.prepare('SELECT * FROM reviews WHERE id = ? AND customer_id = ?').get(req.params.id, me(req));
    if (!cur) throw notFound('Review');
    const b = parse(reviewBody.partial(), req.body);
    db.prepare('UPDATE reviews SET rating = ?, tags = ?, body = ? WHERE id = ?')
      .run(b.rating ?? cur.rating, b.tags ? JSON.stringify(b.tags) : cur.tags, b.body ?? cur.body, cur.id);
    return db.prepare('SELECT id, booking_id AS bookingId, rating, tags, body FROM reviews WHERE id = ?').get(cur.id);
  }));
  r.delete('/reviews/:id', wrap((req) => {
    const d = db.prepare('DELETE FROM reviews WHERE id = ? AND customer_id = ?').run(req.params.id, me(req));
    if (!d.changes) throw notFound('Review');
    return { ok: true };
  }));

  const SEVERITY = { 'No-show': 'High', 'Safety concern': 'High', 'Price changed': 'Medium', 'Poor quality': 'Low', Other: 'Low' };
  r.post('/complaints', wrap((req, res) => {
    const b = parse(z.object({
      bookingId: z.number().int(), type: z.enum(Object.keys(SEVERITY)), detail: z.string().trim().min(5, 'tell us briefly what happened').max(600)
    }), req.body);
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ? AND customer_id = ?').get(b.bookingId, me(req));
    if (!bk) throw notFound('Booking');
    if (!['accepted', 'completed'].includes(bk.status)) throw new HttpError(409, 'You can report a problem once the job is accepted or finished.');
    const n = db.prepare('SELECT COUNT(*) c FROM complaints').get().c;
    const ref = `C-${1040 + n}`;
    db.prepare(`INSERT INTO complaints (ref, booking_id, customer_id, provider_id, type, severity, detail) VALUES (?,?,?,?,?,?,?)`)
      .run(ref, bk.id, me(req), bk.provider_id, b.type, SEVERITY[b.type], b.detail);
    res.status(201);
    return { ref, status: 'New', next: 'An administrator will review your report within 24 hours. You can follow the status here.' };
  }));
  r.get('/complaints', wrap((req) =>
    db.prepare(`SELECT c.ref, c.booking_id AS bookingId, c.type, c.detail, c.status, c.outcome, c.created_at AS createdAt, u.name AS provider
      FROM complaints c JOIN users u ON u.id = c.provider_id WHERE c.customer_id = ? ORDER BY c.id DESC`).all(me(req))));

  return r;
}
