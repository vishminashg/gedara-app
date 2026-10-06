import { Router } from 'express';
import { requireAuth } from './auth.js';
import { HttpError, notFound, parse, wrap, z } from './http.js';
import { notify, slotIsFree, dayLabel, SLOT_LABELS, isoDate } from './db.js';

export function providerRoutes(db) {
  const r = Router();
  r.use('/provider', requireAuth(['provider']));
  const me = req => req.user.id;

  const mapReq = (b) => {
    const open = ['accepted', 'completed'].includes(b.status);
    return {
      id: b.id, job: b.job, problem: b.problem, photos: b.photos, customer: b.customer, area: b.area,
      // Privacy rule (NFR3): the address and phone number are shared only after the provider accepts
      address: open ? b.address : null, phone: open ? b.phone : null, contactShared: open,
      date: b.date, slot: b.slot, when: b.date && b.slot !== null ? `${dayLabel(b.date)} ${SLOT_LABELS[b.slot]}` : null,
      status: b.status, quote: b.quote, price: b.price, pay: b.pay, createdAt: b.created_at
    };
  };
  const SELECT = `SELECT b.*, u.name AS customer, substr(b.address, instr(b.address, ',') + 2) AS area
    FROM bookings b JOIN users u ON u.id = b.customer_id WHERE b.provider_id = ? AND b.status != 'draft'`;
  const owned = (req) => {
    const b = db.prepare(`${SELECT} AND b.id = ?`).get(me(req), req.params.id);
    if (!b) throw notFound('Request');
    return b;
  };

  /* ---------- P1 / P2 requests ---------- */
  r.get('/provider/requests', wrap((req) => {
    const { status } = parse(z.object({ status: z.enum(['pending', 'accepted', 'declined', 'completed', 'cancelled', 'all']).default('all') }), req.query);
    const rows = db.prepare(`${SELECT} ORDER BY b.created_at DESC, b.id DESC`).all(me(req)).map(mapReq);
    const counts = { pending: 0, accepted: 0, today: 0 };
    for (const x of rows) {
      if (x.status === 'pending') counts.pending++;
      if (x.status === 'accepted') { counts.accepted++; if (x.date === isoDate(0)) counts.today++; }
    }
    const p = db.prepare('SELECT accepting FROM providers WHERE user_id = ?').get(me(req));
    return { accepting: !!p.accepting, counts, items: status === 'all' ? rows : rows.filter(x => x.status === status) };
  }));
  r.get('/provider/requests/:id', wrap((req) => mapReq(owned(req))));

  r.patch('/provider/requests/:id', wrap((req) => {
    const cur = owned(req);
    const b = parse(z.object({
      status: z.enum(['accepted', 'declined', 'completed']).optional(),
      quote: z.number().int().min(0).max(1000000).optional(),
      price: z.number().int().min(1).max(1000000).optional()
    }), req.body);
    if (b.quote !== undefined && ['pending', 'accepted'].includes(cur.status)) {
      db.prepare("UPDATE bookings SET quote = ?, updated_at = datetime('now') WHERE id = ?").run(b.quote, cur.id);
    }
    if (b.status) {
      const allowed = { pending: ['accepted', 'declined'], accepted: ['completed'] };
      if (!(allowed[cur.status] || []).includes(b.status)) throw new HttpError(409, `A ${cur.status} request cannot be marked ${b.status}.`);
      if (b.status === 'accepted') {
        if (!slotIsFree(db, me(req), cur.date, cur.slot, cur.id)) throw new HttpError(409, 'That time is no longer free, so the request cannot be accepted.');
        notify(db, cur.customer_id, `Your booking "${cur.job}" was accepted for ${dayLabel(cur.date)} ${SLOT_LABELS[cur.slot]}`);
      }
      if (b.status === 'declined') notify(db, cur.customer_id, `Your booking "${cur.job}" was declined. You can choose another provider.`);
      if (b.status === 'completed') {
        const price = b.price ?? cur.quote;
        if (!price) throw new HttpError(400, 'price: enter the final price');
        db.prepare("UPDATE bookings SET price = ? WHERE id = ?").run(price, cur.id);
        notify(db, cur.customer_id, `"${cur.job}" is marked finished. Please rate the job.`);
      }
      db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(b.status, cur.id);
    }
    return mapReq(owned(req));
  }));

  r.patch('/provider/me/accepting', wrap((req) => {
    const { accepting } = parse(z.object({ accepting: z.boolean() }), req.body);
    db.prepare('UPDATE providers SET accepting = ? WHERE user_id = ?').run(accepting ? 1 : 0, me(req));
    return { accepting };
  }));

  /* ---------- P3 availability ---------- */
  r.get('/provider/blocks', wrap((req) => {
    const blocks = db.prepare('SELECT id, dow, slot FROM blocks WHERE provider_id = ? ORDER BY dow, slot').all(me(req));
    const booked = db.prepare(`SELECT id, date, slot, job, status FROM bookings WHERE provider_id = ? AND status IN ('pending','accepted') AND date >= ? ORDER BY date, slot`)
      .all(me(req), isoDate(0)).map(x => ({ ...x, when: `${dayLabel(x.date)} ${SLOT_LABELS[x.slot]}` }));
    return { blocks, booked, slotLabels: SLOT_LABELS };
  }));
  r.post('/provider/blocks', wrap((req, res) => {
    const b = parse(z.object({ dow: z.number().int().min(1).max(7), slot: z.number().int().min(0).max(3) }), req.body);
    const exists = db.prepare('SELECT id FROM blocks WHERE provider_id = ? AND dow = ? AND slot = ?').get(me(req), b.dow, b.slot);
    if (exists) return { id: exists.id, ...b };
    const id = db.prepare('INSERT INTO blocks (provider_id, dow, slot) VALUES (?,?,?)').run(me(req), b.dow, b.slot).lastInsertRowid;
    res.status(201);
    return { id: Number(id), ...b };
  }));
  r.delete('/provider/blocks/:id', wrap((req) => {
    const d = db.prepare('DELETE FROM blocks WHERE id = ? AND provider_id = ?').run(req.params.id, me(req));
    if (!d.changes) throw notFound('Block');
    return { ok: true };
  }));

  /* ---------- P4 profile and documents ---------- */
  const profile = (id) => {
    const p = db.prepare(`SELECT u.name, u.phone, p.trade, p.area, p.years, p.bio, p.price_from AS priceFrom, p.verified, p.status, p.accepting
      FROM providers p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?`).get(id);
    const documents = db.prepare('SELECT id, type, filename, status, created_at AS createdAt FROM documents WHERE provider_id = ? ORDER BY id').all(id);
    return { ...p, verified: !!p.verified, accepting: !!p.accepting, documents };
  };
  r.get('/provider/profile', wrap((req) => profile(me(req))));
  r.patch('/provider/profile', wrap((req) => {
    const b = parse(z.object({
      name: z.string().trim().min(2).max(80).optional(), area: z.string().trim().min(2).max(60).optional(),
      years: z.number().int().min(0).max(60).optional(), bio: z.string().trim().max(400).optional(),
      priceFrom: z.number().int().min(0).max(1000000).optional(), phone: z.string().trim().max(30).optional()
    }), req.body);
    const cur = profile(me(req));
    db.prepare('UPDATE providers SET area = ?, years = ?, bio = ?, price_from = ? WHERE user_id = ?')
      .run(b.area ?? cur.area, b.years ?? cur.years, b.bio ?? cur.bio, b.priceFrom ?? cur.priceFrom, me(req));
    db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(b.name ?? cur.name, b.phone ?? cur.phone, me(req));
    return profile(me(req));
  }));
  r.post('/provider/documents', wrap((req, res) => {
    const b = parse(z.object({ type: z.enum(['National ID', 'Trade certificate', 'Police report', 'Other']), filename: z.string().trim().min(3).max(80) }), req.body);
    const id = db.prepare('INSERT INTO documents (provider_id, type, filename) VALUES (?,?,?)').run(me(req), b.type, b.filename).lastInsertRowid;
    res.status(201);
    return { id: Number(id), ...b, status: 'uploaded' };
  }));
  r.delete('/provider/documents/:id', wrap((req) => {
    const d = db.prepare('DELETE FROM documents WHERE id = ? AND provider_id = ?').run(req.params.id, me(req));
    if (!d.changes) throw notFound('Document');
    return { ok: true };
  }));

  /* ---------- P5 jobs and payments ---------- */
  const balance = (id) => {
    const earned = db.prepare("SELECT COALESCE(SUM(price),0) s FROM bookings WHERE provider_id = ? AND status = 'completed'").get(id).s;
    const paidOut = db.prepare('SELECT COALESCE(SUM(amount),0) s FROM payouts WHERE provider_id = ?').get(id).s;
    return { earned, paidOut, available: earned - paidOut };
  };
  r.get('/provider/earnings', wrap((req) => {
    const jobs = db.prepare(`SELECT b.id, b.job, u.name AS customer, b.date, b.price, b.pay FROM bookings b JOIN users u ON u.id = b.customer_id
      WHERE b.provider_id = ? AND b.status = 'completed' ORDER BY b.date DESC, b.id DESC`).all(me(req));
    const payouts = db.prepare('SELECT id, amount, status, created_at AS createdAt FROM payouts WHERE provider_id = ? ORDER BY id DESC').all(me(req));
    return { ...balance(me(req)), jobs, payouts };
  }));
  r.post('/provider/payouts', wrap((req, res) => {
    const { amount } = parse(z.object({ amount: z.number().int().min(1) }), req.body);
    const { available } = balance(me(req));
    if (amount > available) throw new HttpError(409, `You can request at most LKR ${available.toLocaleString('en-US')}.`);
    const id = db.prepare('INSERT INTO payouts (provider_id, amount) VALUES (?, ?)').run(me(req), amount).lastInsertRowid;
    res.status(201);
    return { id: Number(id), amount, status: 'requested' };
  }));
  r.delete('/provider/payouts/:id', wrap((req) => {
    const d = db.prepare("DELETE FROM payouts WHERE id = ? AND provider_id = ? AND status = 'requested'").run(req.params.id, me(req));
    if (!d.changes) throw new HttpError(409, 'Only a payout that is still waiting can be cancelled.');
    return { ok: true };
  }));
  return r;
}
