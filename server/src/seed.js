import bcrypt from 'bcryptjs';
import { isoDate } from './db.js';

export const DEMO_PASSWORD = 'gedara123';

const PROVIDERS = [
  { key: 'nimal', rate: 4.8, count: 126, name: 'Nimal Perera', email: 'nimal@gedara.lk', trade: 'plumbing', area: 'Dehiwala', years: 9, from: 2500, ver: 1,
    est: [['Tap or mixer repair', 3500, 5500], ['Blocked drain', 4000, 7000], ['Water heater leak', 6000, 12000]],
    work: ['Tap replacement', 'Pipe repair', 'Bathroom fit'], bio: 'Licensed plumber covering Dehiwala and Mount Lavinia. Fixed quotes before work starts.' },
  { key: 'kasun', rate: 4.6, count: 84, name: 'Kasun Fernando', email: 'kasun@gedara.lk', trade: 'plumbing', area: 'Mount Lavinia', years: 6, from: 2000, ver: 1,
    est: [['Tap or mixer repair', 3000, 5000], ['Blocked drain', 3500, 6500], ['Water heater leak', 6000, 11000]],
    work: ['Sink unblocked', 'Mixer swap', 'Pipe join'], bio: 'Independent plumber, evenings and weekends available.' },
  { key: 'saman', rate: 4.3, count: 31, name: 'Saman Jayasinghe', email: 'saman@gedara.lk', trade: 'plumbing', area: 'Nugegoda', years: 3, from: 1800, ver: 0, status: 'pending',
    est: [['Tap or mixer repair', 2800, 4500], ['Blocked drain', 3000, 5500], ['Water heater leak', 5000, 10000]],
    work: ['Tap fix', 'Drain clear', 'Leak seal'], bio: 'New to the platform. Documents are waiting for review.' },
  { key: 'chamara', rate: 4.7, count: 98, name: 'Chamara Silva', email: 'chamara@gedara.lk', trade: 'electrical', area: 'Nugegoda', years: 11, from: 2200, ver: 1,
    est: [['Switch or socket repair', 2500, 4000], ['Fan installation', 3500, 5500], ['Fault finding', 4000, 8000]],
    work: ['Socket change', 'Fan fitted', 'DB board'], bio: 'Certified electrician, home wiring and fault finding.' },
  { key: 'isuru', rate: 4.4, count: 52, name: 'Isuru Wickramasinghe', email: 'isuru@gedara.lk', trade: 'electrical', area: 'Dehiwala', years: 5, from: 2000, ver: 1,
    est: [['Switch or socket repair', 2300, 3800], ['Fan installation', 3200, 5000], ['Fault finding', 3800, 7500]],
    work: ['Wiring check', 'Light fitted', 'Fuse box'], bio: 'Lighting and small electrical repairs.' },
  { key: 'sparkle', rate: 4.9, count: 210, name: 'Sparkle Home Crew', email: 'sparkle@gedara.lk', trade: 'cleaning', area: 'Mount Lavinia', years: 7, from: 4500, ver: 1,
    est: [['Apartment, 2 bedrooms', 9000, 12000], ['Deep clean, 3 bedrooms', 16000, 22000], ['Kitchen only', 4500, 6500]],
    work: ['Kitchen deep clean', 'Sofa clean', 'Move-out clean'], bio: 'Team of four, own equipment and supplies.' },
  { key: 'nadeeka', rate: 4.5, count: 64, name: 'Nadeeka Rodrigo', email: 'nadeeka@gedara.lk', trade: 'cleaning', area: 'Dehiwala', years: 4, from: 4000, ver: 1,
    est: [['Apartment, 2 bedrooms', 8500, 11000], ['Deep clean, 3 bedrooms', 15000, 20000], ['Kitchen only', 4000, 6000]],
    work: ['Bathroom clean', 'Floor polish', 'Windows'], bio: 'Careful, detail-focused cleaning.' }
];
const APPLICANTS = [
  { name: 'Dinesh Kumara', email: 'dinesh@gedara.lk', trade: 'electrical', area: 'Maharagama', years: 2, from: 1800 },
  { name: 'Anusha Mendis', email: 'anusha.m@gedara.lk', trade: 'cleaning', area: 'Nugegoda', years: 1, from: 3500 }
];
const CUSTOMERS = [
  { key: 'dilani', name: 'Dilani Perera', email: 'dilani@gedara.lk', phone: '077 123 4567', address: 'Galle Road, Dehiwala' },
  { key: 'anusha', name: 'Anusha M.', email: 'anusha@example.lk', phone: '071 555 0198', address: '12 Station Road, Ratmalana' },
  { key: 'rohan', name: 'Rohan D.', email: 'rohan@example.lk', phone: '076 330 4412', address: 'Hill Street, Dehiwala' },
  { key: 'mahesh', name: 'Mahesh P.', email: 'mahesh@example.lk', phone: '070 222 3344', address: 'Temple Road, Mount Lavinia' },
  { key: 'ayesha', name: 'Ayesha R.', email: 'ayesha@example.lk', phone: '072 818 9090', address: 'Lake Drive, Nugegoda' },
  { key: 'tharindu', name: 'Tharindu S.', email: 'tharindu@example.lk', phone: '075 444 1212', address: 'School Lane, Dehiwala' }
];

export function seed(db) {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 8);
  const ins = {
    user: db.prepare('INSERT INTO users (role, name, email, phone, address, password_hash) VALUES (?,?,?,?,?,?)'),
    prov: db.prepare('INSERT INTO providers (user_id, trade, area, years, bio, price_from, verified, status, accepting, listed, rating_seed, count_seed, checks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'),
    est: db.prepare('INSERT INTO estimates (provider_id, job, min_price, max_price) VALUES (?,?,?,?)'),
    work: db.prepare('INSERT INTO work_samples (provider_id, title) VALUES (?,?)'),
    doc: db.prepare('INSERT INTO documents (provider_id, type, filename, status) VALUES (?,?,?,?)'),
    booking: db.prepare(`INSERT INTO bookings (customer_id, provider_id, job, problem, photos, address, phone, date, slot, pay, status, quote, price, created_at, updated_at)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now', ?), datetime('now', ?))`),
    review: db.prepare('INSERT INTO reviews (booking_id, customer_id, provider_id, rating, tags, body, created_at) VALUES (?,?,?,?,?,?, datetime(\'now\', ?))'),
    complaint: db.prepare(`INSERT INTO complaints (ref, booking_id, customer_id, provider_id, type, severity, detail, evidence, status, outcome, created_at)
                           VALUES (?,?,?,?,?,?,?,?,?,?, datetime('now', ?))`),
    msg: db.prepare('INSERT INTO messages (booking_id, sender_id, body) VALUES (?,?,?)'),
    block: db.prepare('INSERT INTO blocks (provider_id, dow, slot) VALUES (?,?,?)'),
    admin_note: db.prepare('INSERT INTO admin_notes (admin_id, body) VALUES (?,?)')
  };
  const ids = {};

  const tx = db.transaction(() => {
    ids.admin = ins.user.run('admin', 'Ruwan Jayawardena', 'ruwan@gedara.lk', '011 234 5678', 'Colombo 03', hash).lastInsertRowid;
    for (const c of CUSTOMERS) ids[c.key] = ins.user.run('customer', c.name, c.email, c.phone, c.address, hash).lastInsertRowid;

    for (const p of PROVIDERS) {
      const uid = ins.user.run('provider', p.name, p.email, '077 ' + String(100 + PROVIDERS.indexOf(p)) + ' 0000', p.area, hash).lastInsertRowid;
      ids[p.key] = uid;
      const status = p.status || 'approved';
      ins.prov.run(uid, p.trade, p.area, p.years, p.bio, p.from, p.ver, status, 1, 1, p.rate, p.count, p.ver ? '[1,1,1,1]' : '[0,0,0,0]');
      for (const [job, lo, hi] of p.est) ins.est.run(uid, job, lo, hi);
      for (const w of p.work) ins.work.run(uid, w);
      ins.doc.run(uid, 'National ID', 'nic.jpg', p.ver ? 'accepted' : 'uploaded');
      ins.doc.run(uid, 'Trade certificate', 'certificate.pdf', p.ver ? 'accepted' : 'uploaded');
    }
    for (const a of APPLICANTS) {
      const uid = ins.user.run('provider', a.name, a.email, '', a.area, hash).lastInsertRowid;
      ids[a.email] = uid;
      ins.prov.run(uid, a.trade, a.area, a.years, 'New applicant.', a.from, 0, 'pending', 1, 0, 0, 0, '[0,0,0,0]');
      ins.doc.run(uid, 'National ID', 'nic.jpg', 'uploaded');
    }

    const today = isoDate(0);
    const hist = (cust, prov, job, daysAgo, price, pay = 'Cash') =>
      ins.booking.run(ids[cust], ids[prov], job, job, 1, '', '', isoDate(-daysAgo), 1, pay, 'completed', price, price, `-${daysAgo} days`, `-${daysAgo} days`).lastInsertRowid;

    // Dilani's past job with Nimal (12 September in the prototype story): enables "Book again" and "Report a problem"
    ids.bDilaniNimal = ins.booking.run(ids.dilani, ids.nimal, 'Tap or mixer repair', 'Kitchen tap was dripping.', 1,
      'Galle Road, Dehiwala', '077 123 4567', isoDate(-24), 1, 'Cash', 'completed', 4200, 4200, '-24 days', '-24 days').lastInsertRowid;
    ids.bAnusha = hist('anusha', 'nimal', 'Tap repair', 3, 3800);
    ids.bRohan = hist('rohan', 'nimal', 'Pipe join', 5, 5200);
    ids.bMahesh = hist('mahesh', 'nimal', 'Blocked drain', 19, 4100);
    ids.bAyesha = hist('ayesha', 'nimal', 'Tap repair', 40, 3600);
    ids.bTharindu = hist('tharindu', 'nimal', 'Mixer swap', 55, 4000);
    ids.bIsuru = hist('tharindu', 'isuru', 'Light fitting', 14, 3000);

    ins.review.run(ids.bAyesha, ids.ayesha, ids.nimal, 5, '["On time","Fair price"]', 'Arrived at the time we agreed and the price matched the estimate. Left the kitchen tidy.', '-14 days');
    ins.review.run(ids.bMahesh, ids.mahesh, ids.nimal, 5, '["Clear explanation"]', 'Explained the problem clearly before starting. Would book again.', '-30 days');
    ins.review.run(ids.bTharindu, ids.tharindu, ids.nimal, 4, '["Polite"]', 'Good work, ten minutes late but he messaged me first.', '-60 days');

    // Open requests waiting for Nimal (provider app, P1 and P2)
    ids.reqKitchen = ins.booking.run(ids.anusha, ids.nimal, 'Blocked kitchen drain', 'Kitchen sink drains very slowly since last week.', 2,
      '12 Station Road, Ratmalana', '071 555 0198', isoDate(1), 0, 'Cash', 'pending', 4500, null, '-3 hours', '-3 hours').lastInsertRowid;
    ids.reqHeater = ins.booking.run(ids.rohan, ids.nimal, 'Water heater leak', 'Water dripping from the bottom of the heater.', 1,
      'Hill Street, Dehiwala', '076 330 4412', isoDate(2), 2, 'Cash', 'pending', 8000, null, '-1 day', '-1 day').lastInsertRowid;
    // Slots already taken by other customers so that availability is realistic
    ins.booking.run(ids.ayesha, ids.nimal, 'Tap repair', '', 0, '', '', today, 0, 'Cash', 'accepted', 3800, null, '-1 day', '-1 day');
    ins.booking.run(ids.mahesh, ids.nimal, 'Pipe repair', '', 0, '', '', today, 1, 'Cash', 'accepted', 4200, null, '-1 day', '-1 day');
    ins.booking.run(ids.tharindu, ids.nimal, 'Tap repair', '', 0, '', '', today, 2, 'Cash', 'accepted', 3500, null, '-1 day', '-1 day');
    ins.booking.run(ids.ayesha, ids.nimal, 'Drain', '', 0, '', '', isoDate(1), 1, 'Cash', 'accepted', 4000, null, '-1 day', '-1 day');
    for (const [prov, d, s] of [['kasun', 0, 0], ['kasun', 0, 1], ['kasun', 0, 2], ['kasun', 0, 3], ['chamara', 0, 0], ['sparkle', 0, 0], ['sparkle', 0, 1]]) {
      ins.booking.run(ids.ayesha, ids[prov], 'Job', '', 0, '', '', isoDate(d), s, 'Cash', 'accepted', 3000, null, '-1 day', '-1 day');
    }

    ins.msg.run(ids.reqKitchen, ids.anusha, 'Hi, the drain has been slow for a week. Can you come tomorrow morning?');

    // Complaints for the admin console (A3)
    ins.complaint.run('C-1038', ids.bRohan, ids.rohan, ids.kasun, 'Price changed', 'Medium',
      'Quoted LKR 4,000 on the phone and asked for LKR 7,500 after the work was done.', '["Chat excerpt","Quote screenshot"]', 'New', null, '-3 hours');
    ins.complaint.run('C-1039', ids.bMahesh, ids.mahesh, ids.saman, 'No-show', 'High',
      'Provider did not arrive for the 2:00 pm slot and stopped replying to messages.', '["Chat excerpt","Booking record"]', 'In review', null, '-1 day');
    ins.complaint.run('C-1035', ids.bIsuru, ids.tharindu, ids.isuru, 'Poor quality', 'Low',
      'Light fitting came loose after two days.', '["Photo"]', 'Resolved', 'Partial refund', '-4 days');

    ins.block.run(ids.nimal, 7, 0); // Nimal does not work Sunday mornings
    ins.admin_note.run(ids.admin, 'Review the two electrician applications before Friday.');
  });
  tx();
  return ids;
}

/** Empties every table and seeds again. Only reachable when ALLOW_TEST_RESET=1 (used by the end-to-end tests). */
export function resetDb(db) {
  db.pragma('foreign_keys = OFF');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
  for (const t of tables) db.prepare(`DELETE FROM ${t.name}`).run();
  db.prepare("DELETE FROM sqlite_sequence").run();
  db.pragma('foreign_keys = ON');
  return seed(db);
}
