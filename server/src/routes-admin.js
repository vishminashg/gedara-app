import { Router } from 'express';
import { requireAuth } from './auth.js';
import { HttpError, notFound, parse, wrap, z } from './http.js';
import { notify, isoDate } from './db.js';

export const CHECK_LABELS = ['National ID matches the applicant', 'Trade certificate is valid', 'Photo of work is genuine', 'Contact number was verified'];
export const OUTCOMES = ['Refund customer', 'Partial refund', 'Warn provider', 'Suspend provider', 'No action'];

export function adminRoutes(db) {
  const r = Router();
  r.use('/admin', requireAuth(['admin']));
  const me = req => req.user.id;

  /* ---------- A1 dashboard ---------- */
  r.get('/admin/stats', wrap((req) => {
    const { days } = parse(z.object({ days: z.coerce.number().int().refine(d => [7, 30].includes(d), 'use 7 or 30').default(7) }), req.query);
    const from = isoDate(-(days - 1));
    const inRange = db.prepare("SELECT COUNT(*) c FROM bookings WHERE status != 'draft' AND date(created_at) >= ?").get(from).c;
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = isoDate(-i);
      series.push({ date: d, bookings: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status != 'draft' AND date(created_at) = ?").get(d).c });
    }
    return {
      days, bookings: inRange, series,
      activeProviders: db.prepare("SELECT COUNT(*) c FROM providers WHERE status = 'approved' AND verified = 1").get().c,
      pendingApplications: db.prepare("SELECT COUNT(*) c FROM providers WHERE status = 'pending'").get().c,
      openComplaints: db.prepare("SELECT COUNT(*) c FROM complaints WHERE status IN ('New','In review')").get().c,
      completedJobs: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status = 'completed'").get().c,
      byStatus: db.prepare("SELECT status, COUNT(*) AS count FROM bookings WHERE status != 'draft' GROUP BY status").all(),
      cancellations: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status = 'cancelled' AND date(updated_at) >= ?").get(from).c,
      payments: db.prepare("SELECT COALESCE(SUM(price),0) s FROM bookings WHERE status = 'completed' AND date(updated_at) >= ?").get(from).s,
      watchlist: db.prepare(`SELECT u.id, u.name, p.trade,
          ROUND((p.rating_seed * p.count_seed + COALESCE((SELECT SUM(rating) FROM reviews r WHERE r.provider_id = u.id),0))
            / NULLIF(p.count_seed + (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = u.id),0), 1) AS rating,
          (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = u.id AND b.status = 'cancelled') AS cancelled,
          (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = u.id AND b.status != 'draft') AS total
        FROM providers p JOIN users u ON u.id = p.user_id WHERE p.listed = 1 ORDER BY rating ASC LIMIT 3`).all()
        .map(w => ({ ...w, flag: (w.rating || 5) < 4.5 || (w.total && w.cancelled / w.total > 0.1) ? 'Review' : 'Healthy' }))
    };
  }));
  r.get('/admin/notes', wrap(() => db.prepare('SELECT id, body, created_at AS createdAt FROM admin_notes ORDER BY id DESC').all()));
  r.post('/admin/notes', wrap((req, res) => {
    const { body } = parse(z.object({ body: z.string().trim().min(2).max(300) }), req.body);
    const id = db.prepare('INSERT INTO admin_notes (admin_id, body) VALUES (?,?)').run(me(req), body).lastInsertRowid;
    res.status(201);
    return { id: Number(id), body };
  }));
  r.delete('/admin/notes/:id', wrap((req) => {
    const d = db.prepare('DELETE FROM admin_notes WHERE id = ?').run(req.params.id);
    if (!d.changes) throw notFound('Note');
    return { ok: true };
  }));

  /* ---------- A2 verification ---------- */
  const app = (id) => {
    const a = db.prepare(`SELECT u.id, u.name, u.email, u.phone, p.trade, p.area, p.years, p.status, p.verified, p.checks, p.submitted_at AS submittedAt
      FROM providers p JOIN users u ON u.id = p.user_id WHERE u.id = ?`).get(id);
    if (!a) return null;
    return { ...a, verified: !!a.verified, checks: JSON.parse(a.checks), checkLabels: CHECK_LABELS,
      documents: db.prepare('SELECT id, type, filename, status FROM documents WHERE provider_id = ? ORDER BY id').all(id) };
  };
  r.get('/admin/applications', wrap((req) => {
    const { status } = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected']).default('pending') }), req.query);
    return db.prepare(`SELECT u.id FROM providers p JOIN users u ON u.id = p.user_id WHERE p.status = ? ORDER BY p.submitted_at, u.id`).all(status).map(x => app(x.id));
  }));
  r.get('/admin/applications/:id', wrap((req) => app(req.params.id) || (() => { throw notFound('Application'); })()));
  r.patch('/admin/applications/:id/checks', wrap((req) => {
    const a = app(req.params.id); if (!a) throw notFound('Application');
    const { checks } = parse(z.object({ checks: z.array(z.number().int().min(0).max(1)).length(4) }), req.body);
    db.prepare('UPDATE providers SET checks = ? WHERE user_id = ?').run(JSON.stringify(checks), a.id);
    return app(a.id);
  }));
  r.post('/admin/applications/:id/approve', wrap((req) => {
    const a = app(req.params.id); if (!a) throw notFound('Application');
    if (a.status !== 'pending') throw new HttpError(409, 'This application was already decided.');
    if (a.checks.some(c => !c)) throw new HttpError(409, 'Tick every document check before approving.');
    db.transaction(() => {
      db.prepare("UPDATE providers SET status='approved', verified=1, listed=1 WHERE user_id = ?").run(a.id);
      db.prepare("UPDATE documents SET status='accepted' WHERE provider_id = ?").run(a.id);
    })();
    notify(db, a.id, 'Your profile was approved. You now show the Verified badge.');
    return app(a.id);
  }));
  r.post('/admin/applications/:id/reject', wrap((req) => {
    const a = app(req.params.id); if (!a) throw notFound('Application');
    const { reason } = parse(z.object({ reason: z.string().trim().min(3, 'give a short reason').max(200) }), req.body);
    if (a.status !== 'pending') throw new HttpError(409, 'This application was already decided.');
    db.prepare("UPDATE providers SET status='rejected', verified=0, listed=0 WHERE user_id = ?").run(a.id);
    notify(db, a.id, `Your application was not approved: ${reason}`);
    return app(a.id);
  }));

  /* ---------- A3 complaints ---------- */
  const comp = (id) => {
    const c = db.prepare(`SELECT c.id, c.ref, c.type, c.severity, c.detail, c.evidence, c.status, c.outcome, c.created_at AS createdAt, c.booking_id AS bookingId,
      cu.name AS customer, pu.name AS provider FROM complaints c JOIN users cu ON cu.id = c.customer_id JOIN users pu ON pu.id = c.provider_id
      WHERE c.id = ?`).get(id);
    if (!c) return null;
    return { ...c, evidence: JSON.parse(c.evidence),
      notes: db.prepare(`SELECT n.id, n.body, n.created_at AS createdAt, u.name AS admin FROM complaint_notes n JOIN users u ON u.id = n.admin_id WHERE n.complaint_id = ? ORDER BY n.id`).all(id) };
  };
  r.get('/admin/complaints', wrap((req) => {
    const { status } = parse(z.object({ status: z.enum(['All', 'New', 'In review', 'Resolved', 'Dismissed']).default('All') }), req.query);
    const rows = db.prepare(`SELECT id FROM complaints ${status === 'All' ? '' : 'WHERE status = ?'} ORDER BY
      CASE status WHEN 'New' THEN 0 WHEN 'In review' THEN 1 ELSE 2 END, id DESC`).all(...(status === 'All' ? [] : [status]));
    return { outcomes: OUTCOMES, items: rows.map(x => comp(x.id)) };
  }));
  r.get('/admin/complaints/:id', wrap((req) => comp(req.params.id) || (() => { throw notFound('Complaint'); })()));
  r.patch('/admin/complaints/:id', wrap((req) => {
    const c = comp(req.params.id); if (!c) throw notFound('Complaint');
    const b = parse(z.object({ status: z.enum(['In review', 'Resolved', 'Dismissed']), outcome: z.enum(OUTCOMES).optional() }), req.body);
    if (b.status === 'Resolved' && !b.outcome) throw new HttpError(400, 'outcome: choose how the complaint was settled');
    if (['Resolved', 'Dismissed'].includes(c.status)) throw new HttpError(409, 'This complaint is already closed.');
    if (b.status === 'In review' && c.status === 'In review') throw new HttpError(409, 'Both sides were already contacted.');
    db.prepare('UPDATE complaints SET status = ?, outcome = ? WHERE id = ?').run(b.status, b.status === 'Dismissed' ? 'No action' : (b.outcome ?? null), c.id);
    const ids = db.prepare('SELECT customer_id, provider_id FROM complaints WHERE id = ?').get(c.id);
    notify(db, ids.customer_id, `Your report ${c.ref} is now ${b.status.toLowerCase()}${b.outcome ? ': ' + b.outcome : ''}`);
    if (b.status === 'In review') notify(db, ids.provider_id, `A report (${c.ref}) about one of your jobs is being reviewed. Please reply to the administrator.`);
    return comp(c.id);
  }));
  r.post('/admin/complaints/:id/notes', wrap((req, res) => {
    const c = comp(req.params.id); if (!c) throw notFound('Complaint');
    const { body } = parse(z.object({ body: z.string().trim().min(2).max(400) }), req.body);
    db.prepare('INSERT INTO complaint_notes (complaint_id, admin_id, body) VALUES (?,?,?)').run(c.id, me(req), body);
    res.status(201);
    return comp(c.id);
  }));
  r.delete('/admin/complaints/:id/notes/:noteId', wrap((req) => {
    const d = db.prepare('DELETE FROM complaint_notes WHERE id = ? AND complaint_id = ?').run(req.params.noteId, req.params.id);
    if (!d.changes) throw notFound('Note');
    return comp(req.params.id);
  }));
  return r;
}
