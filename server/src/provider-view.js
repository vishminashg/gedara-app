import { nextFree, SLOT_LABELS, isoDate, dayLabel, slotIsFree } from './db.js';

export const KEYWORDS = {
  tap: 'plumbing', drain: 'plumbing', leak: 'plumbing', pipe: 'plumbing', water: 'plumbing', heater: 'plumbing',
  wiring: 'electrical', wire: 'electrical', switch: 'electrical', fan: 'electrical', socket: 'electrical', light: 'electrical',
  plumber: 'plumbing', plumbers: 'plumbing', plumbing: 'plumbing', electrician: 'electrical', electric: 'electrical', electrical: 'electrical',
  cleaner: 'cleaning', cleaners: 'cleaning', cleaning: 'cleaning', clean: 'cleaning', kitchen: 'cleaning', sofa: 'cleaning', floor: 'cleaning'
};

const BASE = `
  SELECT u.id, u.name, p.trade, p.area, p.years, p.bio, p.price_from, p.verified, p.status, p.accepting,
    ROUND((p.rating_seed * p.count_seed + COALESCE((SELECT SUM(rating) FROM reviews r WHERE r.provider_id = u.id), 0))
      / NULLIF(p.count_seed + (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = u.id), 0), 1) AS rating,
    p.count_seed + (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = u.id) AS review_count
  FROM providers p JOIN users u ON u.id = p.user_id`;

export function providerCard(db, row, customerId) {
  const fav = customerId
    ? !!db.prepare('SELECT 1 FROM favourites WHERE customer_id = ? AND provider_id = ?').get(customerId, row.id)
    : false;
  return {
    id: row.id, name: row.name, trade: row.trade, area: row.area, years: row.years,
    rating: row.rating ?? 0, reviewCount: row.review_count, verified: !!row.verified,
    priceFrom: row.price_from, accepting: !!row.accepting, nextFree: nextFree(db, row.id), favourite: fav
  };
}

export function listProviders(db, { q, svc, verified, minRating, today }, customerId) {
  let rows = db.prepare(`${BASE} WHERE p.listed = 1 AND p.status != 'rejected' ORDER BY u.name`).all();
  let trade = svc;
  const term = (q || '').trim().toLowerCase();
  if (term) {
    const hit = term.split(/\s+/).map(w => KEYWORDS[w]).find(Boolean);
    if (hit) trade = hit;
    rows = rows.filter(r =>
      r.name.toLowerCase().includes(term) || r.trade.includes(term) || r.area.toLowerCase().includes(term) ||
      term.split(/\s+/).some(w => KEYWORDS[w] === r.trade));
  }
  if (trade) rows = rows.filter(r => r.trade === trade);
  if (verified) rows = rows.filter(r => r.verified);
  if (minRating) rows = rows.filter(r => (r.rating ?? 0) >= minRating);
  let cards = rows.map(r => providerCard(db, r, customerId));
  if (today) cards = cards.filter(c => c.nextFree && c.nextFree.date === isoDate(0));
  return cards.sort((a, b) => b.rating - a.rating);
}

export function providerProfile(db, id, customerId) {
  const row = db.prepare(`${BASE} WHERE u.id = ? AND p.listed = 1`).get(id);
  if (!row) return null;
  const card = providerCard(db, row, customerId);
  const estimates = db.prepare('SELECT job, min_price AS min, max_price AS max FROM estimates WHERE provider_id = ? ORDER BY id').all(id);
  const work = db.prepare('SELECT title FROM work_samples WHERE provider_id = ? ORDER BY id').all(id).map(r => r.title);
  const reviews = db.prepare(
    `SELECT r.id, r.rating, r.tags, r.body, r.created_at, u.name AS customer FROM reviews r JOIN users u ON u.id = r.customer_id
     WHERE r.provider_id = ? ORDER BY r.created_at DESC LIMIT 10`).all(id)
    .map(r => ({ ...r, tags: JSON.parse(r.tags) }));
  return { ...card, bio: row.bio, estimates, work, reviews };
}

export function slotGrid(db, providerId, days = 4) {
  const grid = [];
  for (let d = 0; d < days; d++) {
    const date = isoDate(d);
    grid.push({
      date, label: dayLabel(date),
      slots: SLOT_LABELS.map((label, slot) => ({ slot, label, free: slotIsFree(db, providerId, date, slot, 0, { checkPast: true }) }))
    });
  }
  return grid;
}
