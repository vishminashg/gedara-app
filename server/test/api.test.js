import { tc, assert, isoDate } from './helpers.js';
import { slotPassed } from '../src/db.js';

/* ============ Authentication and access (NFR3 privacy and security) ============ */
tc('TC-01', 'NFR3', 'Login succeeds with correct credentials and returns role', async ({ api }) => {
  const c = await api.customer();
  const me = await c.get('/api/me');
  assert.equal(me.body.role, 'customer');
});
tc('TC-02', 'NFR3', 'Login fails with a wrong password (401)', async ({ api }) => {
  const r = await api.post('/api/auth/login', { email: 'dilani@gedara.lk', password: 'wrong' });
  assert.equal(r.status, 401);
});
tc('TC-03', 'NFR3', 'Protected route without a token is rejected (401)', async ({ api }) => {
  assert.equal((await api.get('/api/bookings')).status, 401);
});
tc('TC-04', 'NFR3', 'A customer cannot open the admin API (403)', async ({ api }) => {
  const c = await api.customer();
  assert.equal((await c.get('/api/admin/stats')).status, 403);
});
tc('TC-05', 'NFR3', 'Registration creates a customer and rejects a duplicate email (409)', async ({ api }) => {
  const body = { role: 'customer', name: 'Test User', email: 'new@example.lk', password: 'secret1' };
  assert.equal((await api.post('/api/auth/register', body)).status, 201);
  assert.equal((await api.post('/api/auth/register', body)).status, 409);
});
tc('TC-06', 'NFR3', 'Registration validates input (short password gives 400)', async ({ api }) => {
  const r = await api.post('/api/auth/register', { role: 'customer', name: 'Test', email: 'a@b.lk', password: '123' });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /password/);
});

/* ============ C1 / C2 / C3: search, filter, profile (FR1-FR4) ============ */
tc('TC-07', 'FR1', 'Browse providers by service returns only that trade', async ({ api }) => {
  const c = await api.customer();
  const r = await c.get('/api/providers?svc=electrical');
  assert.equal(r.status, 200);
  assert.ok(r.body.length >= 2);
  assert.ok(r.body.every(p => p.trade === 'electrical'));
});
tc('TC-08', 'FR1', 'Free-text search maps "leaking tap" to plumbers', async ({ api }) => {
  const c = await api.customer();
  const r = await c.get('/api/providers?q=' + encodeURIComponent('leaking tap'));
  assert.ok(r.body.length > 0 && r.body.every(p => p.trade === 'plumbing'));
});
tc('TC-09', 'FR2', 'Verified-only filter hides unverified providers', async ({ api }) => {
  const c = await api.customer();
  const r = await c.get('/api/providers?svc=plumbing&verified=1');
  assert.ok(r.body.every(p => p.verified));
  assert.ok(!r.body.some(p => p.name === 'Saman Jayasinghe'));
});
tc('TC-10', 'FR2', 'Rating filter 4.5+ returns only providers rated 4.5 or higher', async ({ api }) => {
  const c = await api.customer();
  const r = await c.get('/api/providers?svc=plumbing&min=4.5');
  assert.ok(r.body.length > 0 && r.body.every(p => p.rating >= 4.5));
});
tc('TC-11', 'FR4', 'Free-today filter returns only providers with a slot today', async ({ api }) => {
  const c = await api.customer();
  const r = await c.get('/api/providers?today=1');
  assert.ok(r.body.every(p => p.nextFree.date === isoDate(0)));
});
tc('TC-12', 'FR3', 'Profile shows price estimates, reviews and work samples', async ({ api, ids }) => {
  const c = await api.customer();
  const r = await c.get('/api/providers/' + ids.nimal);
  assert.equal(r.body.estimates.length, 3);
  assert.ok(r.body.reviews.length >= 3);
  assert.ok(r.body.work.length >= 3);
  assert.equal(r.body.verified, true);
});
tc('TC-13', 'FR4', 'Slot grid marks taken slots as not free', async ({ api, ids }) => {
  const c = await api.customer();
  const r = await c.get(`/api/providers/${ids.nimal}/slots`);
  assert.equal(r.body.length, 4);
  assert.equal(r.body[0].slots[0].free, false);
  assert.equal(r.body[0].slots[3].free, true);
});
tc('TC-14', 'FR1', 'Unknown provider returns 404', async ({ api }) => {
  const c = await api.customer();
  assert.equal((await c.get('/api/providers/99999')).status, 404);
});
tc('TC-15', 'FR12', 'Favourites: add (Create), list (Read) and remove (Delete)', async ({ api, ids }) => {
  const c = await api.customer();
  assert.equal((await c.post('/api/favourites/' + ids.nimal)).status, 201);
  assert.equal((await c.get('/api/favourites')).body.length, 1);
  assert.equal((await c.delete('/api/favourites/' + ids.nimal)).status, 200);
  assert.equal((await c.get('/api/favourites')).body.length, 0);
});

/* ============ C4 / C5 / C6 / C8: booking lifecycle (FR3, FR5, FR7, FR8, FR10, FR12, FR13, NFR5) ============ */
const draft = (c, ids, extra = {}) => c.post('/api/bookings', { providerId: ids.nimal, job: 'Tap or mixer repair', problem: 'Kitchen tap is leaking badly', photos: 1, ...extra });

tc('TC-16', 'FR5', 'Create a booking draft with problem and photo count', async ({ api, ids }) => {
  const c = await api.customer();
  const r = await draft(c, ids);
  assert.equal(r.status, 201);
  assert.equal(r.body.status, 'draft');
  assert.equal(r.body.photos, 1);
  assert.equal(r.body.address, 'Galle Road, Dehiwala');
});
tc('TC-17', 'FR5', 'Update a draft (Update): change the problem text and photos', async ({ api, ids }) => {
  const c = await api.customer();
  const b = (await draft(c, ids)).body;
  const r = await c.patch('/api/bookings/' + b.id, { problem: 'The tap is dripping all night', photos: 3 });
  assert.equal(r.body.problem, 'The tap is dripping all night');
  assert.equal(r.body.photos, 3);
});
tc('TC-18', 'FR5', 'Sending a request without a problem description is rejected (400)', async ({ api, ids }) => {
  const c = await api.customer();
  const b = (await draft(c, ids, { problem: '' })).body;
  await c.patch('/api/bookings/' + b.id, { date: isoDate(1), slot: 3 });
  assert.equal((await c.post(`/api/bookings/${b.id}/submit`)).status, 400);
});
tc('TC-19', 'FR3 FR4 FR13', 'Submit a booking with a free slot: status becomes pending', async ({ api, ids }) => {
  const c = await api.customer();
  const b = (await draft(c, ids)).body;
  await c.patch('/api/bookings/' + b.id, { date: isoDate(1), slot: 3, pay: 'Cash' });
  const r = await c.post(`/api/bookings/${b.id}/submit`);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'pending');
  assert.match(r.body.when, /Tomorrow 4:00 pm/);
});
tc('TC-20', 'NFR5', 'Double booking: a slot that is already taken cannot be submitted (409)', async ({ api, ids }) => {
  const c = await api.customer();
  const b = (await draft(c, ids)).body;
  await c.patch('/api/bookings/' + b.id, { date: isoDate(0), slot: 0 }); // seeded as taken
  assert.equal((await c.post(`/api/bookings/${b.id}/submit`)).status, 409);
});
tc('TC-21', 'NFR5', 'Two customers cannot hold the same slot', async ({ api, ids }) => {
  const c1 = await api.customer();
  const c2 = await api.login('anusha@example.lk');
  const mk = async (c) => { const b = (await draft(c, ids)).body; await c.patch('/api/bookings/' + b.id, { date: isoDate(3), slot: 2, address: 'X road' }); return b.id; };
  const a = await mk(c1), b = await mk(c2);
  assert.equal((await c1.post(`/api/bookings/${a}/submit`)).status, 200);
  assert.equal((await c2.post(`/api/bookings/${b}/submit`)).status, 409);
});
tc('TC-22', 'FR4 NFR5', 'Provider-blocked weekday and slot cannot be booked', async ({ api, ids }) => {
  const p = await api.provider(); const c = await api.customer();
  // find the next Saturday
  let d = 0; while (new Date(isoDate(d) + 'T00:00:00').getDay() !== 6) d++;
  assert.equal((await p.post('/api/provider/blocks', { dow: 6, slot: 2 })).status, 201);
  const b = (await draft(c, ids)).body;
  await c.patch('/api/bookings/' + b.id, { date: isoDate(d), slot: 2 });
  assert.equal((await c.post(`/api/bookings/${b.id}/submit`)).status, 409);
});
tc('TC-23', 'FR12', 'Customer can read My bookings with upcoming and past tabs', async ({ api, ids }) => {
  const c = await api.customer();
  await draft(c, ids);
  const up = await c.get('/api/bookings?tab=upcoming');
  const past = await c.get('/api/bookings?tab=past');
  assert.ok(up.body.every(b => ['draft', 'pending', 'accepted'].includes(b.status)));
  assert.ok(past.body.some(b => b.status === 'completed'));
});
tc('TC-24', 'FR12', 'Book again creates a new draft for the same provider and job', async ({ api, ids }) => {
  const c = await api.customer();
  const r = await c.post(`/api/bookings/${ids.bDilaniNimal}/rebook`);
  assert.equal(r.status, 201);
  assert.equal(r.body.providerId, ids.nimal);
  assert.equal(r.body.status, 'draft');
});
tc('TC-25', 'FR12', 'Book again is refused for an unfinished booking (409)', async ({ api, ids }) => {
  const c = await api.customer();
  const b = (await draft(c, ids)).body;
  assert.equal((await c.post(`/api/bookings/${b.id}/rebook`)).status, 409);
});
tc('TC-26', 'FR8', 'Cancel a pending booking (Update) and notify the provider', async ({ api, ids }) => {
  const c = await api.customer(); const p = await api.provider();
  const b = (await draft(c, ids)).body;
  await c.patch('/api/bookings/' + b.id, { date: isoDate(2), slot: 3 });
  await c.post(`/api/bookings/${b.id}/submit`);
  const r = await c.post(`/api/bookings/${b.id}/cancel`);
  assert.equal(r.body.status, 'cancelled');
  const n = await p.get('/api/notifications');
  assert.ok(n.body.items.some(i => /cancelled/.test(i.text)));
});
tc('TC-27', 'FR5 FR12', 'Delete a draft (Delete); an accepted booking cannot be deleted (409)', async ({ api, ids }) => {
  const c = await api.customer(); const p = await api.provider();
  const d = (await draft(c, ids)).body;
  assert.equal((await c.delete('/api/bookings/' + d.id)).status, 200);
  assert.equal((await c.get('/api/bookings/' + d.id)).status, 404);
  await p.patch('/api/provider/requests/' + ids.reqKitchen, { status: 'accepted' });
  const acc = await api.login('anusha@example.lk');
  assert.equal((await acc.delete('/api/bookings/' + ids.reqKitchen)).status, 409);
});
tc('TC-28', 'NFR3', 'A customer cannot read another customer\'s booking (404)', async ({ api, ids }) => {
  const c = await api.customer();
  assert.equal((await c.get('/api/bookings/' + ids.reqKitchen)).status, 404);
});
tc('TC-29', 'FR8 NFR5', 'Changing the time of an accepted booking sends it back to pending', async ({ api, ids }) => {
  const c = await api.login('anusha@example.lk'); const p = await api.provider();
  await p.patch('/api/provider/requests/' + ids.reqKitchen, { status: 'accepted' });
  const r = await c.patch('/api/bookings/' + ids.reqKitchen, { date: isoDate(3), slot: 3 });
  assert.equal(r.body.status, 'pending');
});

/* ============ C7: chat (FR7, NFR3) ============ */
tc('TC-30', 'FR7', 'Send (Create) and read chat messages between customer and provider', async ({ api, ids }) => {
  const c = await api.login('anusha@example.lk'); const p = await api.provider();
  assert.equal((await c.post(`/api/bookings/${ids.reqKitchen}/messages`, { body: 'Is there parking?' })).status, 201);
  assert.equal((await p.post(`/api/bookings/${ids.reqKitchen}/messages`, { body: 'Yes, I will park outside.' })).status, 201);
  const r = await c.get(`/api/bookings/${ids.reqKitchen}/messages`);
  assert.equal(r.body.length, 3); // one seeded + two new
});
tc('TC-31', 'FR7', 'Delete own message (Delete); cannot delete someone else\'s (404)', async ({ api, ids }) => {
  const c = await api.login('anusha@example.lk'); const p = await api.provider();
  const m = (await c.post(`/api/bookings/${ids.reqKitchen}/messages`, { body: 'Oops wrong text' })).body;
  assert.equal((await p.delete('/api/messages/' + m.id)).status, 404);
  assert.equal((await c.delete('/api/messages/' + m.id)).status, 200);
});
tc('TC-32', 'NFR3', 'Someone who is not part of the booking cannot read the chat (404)', async ({ api, ids }) => {
  const other = await api.login('rohan@example.lk');
  assert.equal((await other.get(`/api/bookings/${ids.reqKitchen}/messages`)).status, 404);
});
tc('TC-33', 'FR7', 'Empty chat message is rejected (400)', async ({ api, ids }) => {
  const c = await api.login('anusha@example.lk');
  assert.equal((await c.post(`/api/bookings/${ids.reqKitchen}/messages`, { body: '   ' })).status, 400);
});

/* ============ C9: reviews and complaints (FR10, NFR4, NFR6) ============ */
tc('TC-34', 'NFR4', 'Review only after a completed job: pending booking is refused (409)', async ({ api, ids }) => {
  const c = await api.login('anusha@example.lk');
  const r = await c.post('/api/reviews', { bookingId: ids.reqKitchen, rating: 5 });
  assert.equal(r.status, 409);
});
tc('TC-35', 'NFR4', 'Create, Update and Delete a review on a completed job; rating updates', async ({ api, ids }) => {
  const c = await api.customer();
  const before = (await c.get('/api/providers/' + ids.nimal)).body.reviewCount;
  const created = await c.post('/api/reviews', { bookingId: ids.bDilaniNimal, rating: 5, tags: ['On time'], body: 'Great work' });
  assert.equal(created.status, 201);
  assert.equal((await c.get('/api/providers/' + ids.nimal)).body.reviewCount, before + 1);
  assert.equal((await c.post('/api/reviews', { bookingId: ids.bDilaniNimal, rating: 4 })).status, 409);
  const upd = await c.patch('/api/reviews/' + created.body.id, { rating: 4 });
  assert.equal(upd.body.rating, 4);
  assert.equal((await c.delete('/api/reviews/' + created.body.id)).status, 200);
  assert.equal((await c.get('/api/providers/' + ids.nimal)).body.reviewCount, before);
});
tc('TC-36', 'NFR4', 'Rating must be 1 to 5 (400)', async ({ api, ids }) => {
  const c = await api.customer();
  assert.equal((await c.post('/api/reviews', { bookingId: ids.bDilaniNimal, rating: 9 })).status, 400);
});
tc('TC-37', 'FR10 NFR6', 'Report a problem creates a complaint with a reference and severity', async ({ api, ids }) => {
  const c = await api.customer();
  const r = await c.post('/api/complaints', { bookingId: ids.bDilaniNimal, type: 'Poor quality', detail: 'The tap started dripping again after two days.' });
  assert.equal(r.status, 201);
  assert.match(r.body.ref, /^C-\d+$/);
  const list = await c.get('/api/complaints');
  assert.equal(list.body[0].status, 'New');
});
tc('TC-38', 'FR10', 'Report needs a description (400) and a valid booking (404)', async ({ api, ids }) => {
  const c = await api.customer();
  assert.equal((await c.post('/api/complaints', { bookingId: ids.bDilaniNimal, type: 'Other', detail: 'x' })).status, 400);
  assert.equal((await c.post('/api/complaints', { bookingId: 99999, type: 'Other', detail: 'Something wrong here' })).status, 404);
});

/* ============ P1 / P2: provider requests (FR5, FR6, FR8, NFR3) ============ */
tc('TC-39', 'FR6', 'Provider sees new requests with counts', async ({ api }) => {
  const p = await api.provider();
  const r = await p.get('/api/provider/requests');
  assert.equal(r.body.counts.pending, 2);
  assert.ok(r.body.items.some(i => i.job === 'Blocked kitchen drain'));
});
tc('TC-40', 'NFR3', 'Customer address and phone are hidden until the request is accepted', async ({ api, ids }) => {
  const p = await api.provider();
  const before = (await p.get('/api/provider/requests/' + ids.reqKitchen)).body;
  assert.equal(before.address, null);
  assert.equal(before.phone, null);
  await p.patch('/api/provider/requests/' + ids.reqKitchen, { status: 'accepted' });
  const after = (await p.get('/api/provider/requests/' + ids.reqKitchen)).body;
  assert.equal(after.address, '12 Station Road, Ratmalana');
  assert.equal(after.phone, '071 555 0198');
});
tc('TC-41', 'FR6 FR8', 'Accept a request (Update) and the customer is notified', async ({ api, ids }) => {
  const p = await api.provider(); const c = await api.login('anusha@example.lk');
  const r = await p.patch('/api/provider/requests/' + ids.reqKitchen, { status: 'accepted' });
  assert.equal(r.body.status, 'accepted');
  const n = await c.get('/api/notifications');
  assert.ok(n.body.items.some(i => /accepted/.test(i.text)));
});
tc('TC-42', 'FR6', 'Decline a request; a declined request cannot be accepted later (409)', async ({ api, ids }) => {
  const p = await api.provider();
  assert.equal((await p.patch('/api/provider/requests/' + ids.reqHeater, { status: 'declined' })).body.status, 'declined');
  assert.equal((await p.patch('/api/provider/requests/' + ids.reqHeater, { status: 'accepted' })).status, 409);
});
tc('TC-43', 'FR5 FR6', 'Provider can add a quote to a request (Update)', async ({ api, ids }) => {
  const p = await api.provider();
  const r = await p.patch('/api/provider/requests/' + ids.reqKitchen, { quote: 5200 });
  assert.equal(r.body.quote, 5200);
});
tc('TC-44', 'NFR3', 'A provider cannot open another provider\'s request (404)', async ({ api, ids }) => {
  const k = await api.login('kasun@gedara.lk');
  assert.equal((await k.get('/api/provider/requests/' + ids.reqKitchen)).status, 404);
});
tc('TC-45', 'FR6', 'Switch "Accepting jobs" off and on (Update)', async ({ api }) => {
  const p = await api.provider();
  assert.equal((await p.patch('/api/provider/me/accepting', { accepting: false })).body.accepting, false);
  assert.equal((await p.get('/api/provider/requests')).body.accepting, false);
});

/* ============ P3: availability (FR4, FR6, NFR5) ============ */
tc('TC-46', 'FR4 FR6', 'Block a slot (Create), read it back and unblock it (Delete)', async ({ api }) => {
  const p = await api.provider();
  const b = await p.post('/api/provider/blocks', { dow: 6, slot: 3 });
  assert.equal(b.status, 201);
  assert.ok((await p.get('/api/provider/blocks')).body.blocks.some(x => x.dow === 6 && x.slot === 3));
  assert.equal((await p.delete('/api/provider/blocks/' + b.body.id)).status, 200);
  assert.ok(!(await p.get('/api/provider/blocks')).body.blocks.some(x => x.dow === 6 && x.slot === 3));
});
tc('TC-47', 'FR4', 'Blocking the same slot twice does not create a duplicate', async ({ api }) => {
  const p = await api.provider();
  await p.post('/api/provider/blocks', { dow: 5, slot: 1 });
  await p.post('/api/provider/blocks', { dow: 5, slot: 1 });
  assert.equal((await p.get('/api/provider/blocks')).body.blocks.filter(x => x.dow === 5 && x.slot === 1).length, 1);
});
tc('TC-48', 'FR4', 'Invalid weekday or slot is rejected (400)', async ({ api }) => {
  const p = await api.provider();
  assert.equal((await p.post('/api/provider/blocks', { dow: 9, slot: 1 })).status, 400);
});

/* ============ P4: profile and documents (FR9) ============ */
tc('TC-49', 'FR9', 'Provider can update profile details (Update)', async ({ api }) => {
  const p = await api.provider();
  const r = await p.patch('/api/provider/profile', { bio: 'Fixed quotes. Evening visits too.', priceFrom: 2800 });
  assert.equal(r.body.bio, 'Fixed quotes. Evening visits too.');
  assert.equal(r.body.priceFrom, 2800);
});
tc('TC-50', 'FR9', 'Upload (Create) and remove (Delete) a verification document', async ({ api }) => {
  const p = await api.provider();
  const d = await p.post('/api/provider/documents', { type: 'Police report', filename: 'police-report.pdf' });
  assert.equal(d.status, 201);
  assert.ok((await p.get('/api/provider/profile')).body.documents.some(x => x.filename === 'police-report.pdf'));
  assert.equal((await p.delete('/api/provider/documents/' + d.body.id)).status, 200);
});

/* ============ P5: jobs and payments (FR6, FR13) ============ */
tc('TC-51', 'FR13', 'Mark an accepted job finished with a price (Update) and see it in earnings', async ({ api, ids }) => {
  const p = await api.provider();
  await p.patch('/api/provider/requests/' + ids.reqKitchen, { status: 'accepted' });
  const before = (await p.get('/api/provider/earnings')).body;
  const r = await p.patch('/api/provider/requests/' + ids.reqKitchen, { status: 'completed', price: 4700 });
  assert.equal(r.body.status, 'completed');
  const after = (await p.get('/api/provider/earnings')).body;
  assert.equal(after.available, before.available + 4700);
});
tc('TC-52', 'FR6', 'A pending request cannot be marked finished (409)', async ({ api, ids }) => {
  const p = await api.provider();
  assert.equal((await p.patch('/api/provider/requests/' + ids.reqKitchen, { status: 'completed', price: 100 })).status, 409);
});
tc('TC-53', 'FR13', 'Request a payout (Create), cannot exceed balance (409), cancel it (Delete)', async ({ api }) => {
  const p = await api.provider();
  const e = (await p.get('/api/provider/earnings')).body;
  assert.equal((await p.post('/api/provider/payouts', { amount: e.available + 1 })).status, 409);
  const ok = await p.post('/api/provider/payouts', { amount: 5000 });
  assert.equal(ok.status, 201);
  assert.equal((await p.get('/api/provider/earnings')).body.available, e.available - 5000);
  assert.equal((await p.delete('/api/provider/payouts/' + ok.body.id)).status, 200);
  assert.equal((await p.get('/api/provider/earnings')).body.available, e.available);
});

/* ============ A1: dashboard (FR11) ============ */
tc('TC-54', 'FR11', 'Dashboard stats for 7 and 30 days; invalid range is rejected', async ({ api }) => {
  const a = await api.admin();
  const s7 = (await a.get('/api/admin/stats?days=7')).body;
  assert.equal(s7.series.length, 7);
  assert.equal(s7.openComplaints, 2);
  assert.equal(s7.pendingApplications, 3);
  assert.equal((await a.get('/api/admin/stats?days=30')).body.series.length, 30);
  assert.equal((await a.get('/api/admin/stats?days=5')).status, 400);
});
tc('TC-55', 'FR11', 'Admin notes: add (Create), read and delete (Delete)', async ({ api }) => {
  const a = await api.admin();
  const n = await a.post('/api/admin/notes', { body: 'Call Saman about his certificate.' });
  assert.equal(n.status, 201);
  assert.ok((await a.get('/api/admin/notes')).body.some(x => x.id === n.body.id));
  assert.equal((await a.delete('/api/admin/notes/' + n.body.id)).status, 200);
});

/* ============ A2: provider verification (FR9, NFR4) ============ */
tc('TC-56', 'FR9', 'Verification queue lists pending applications with documents', async ({ api }) => {
  const a = await api.admin();
  const q = (await a.get('/api/admin/applications')).body;
  assert.equal(q.length, 3);
  assert.ok(q.find(x => x.name === 'Saman Jayasinghe').documents.length >= 1);
});
tc('TC-57', 'FR9 NFR4', 'Approve is refused until every check is ticked (409)', async ({ api, ids }) => {
  const a = await api.admin();
  assert.equal((await a.post(`/api/admin/applications/${ids.saman}/approve`)).status, 409);
});
tc('TC-58', 'FR9 NFR4', 'Tick checks (Update) then approve: provider becomes Verified', async ({ api, ids }) => {
  const a = await api.admin(); const c = await api.customer();
  await a.patch(`/api/admin/applications/${ids.saman}/checks`, { checks: [1, 1, 1, 1] });
  const r = await a.post(`/api/admin/applications/${ids.saman}/approve`);
  assert.equal(r.body.verified, true);
  const prof = (await c.get('/api/providers/' + ids.saman)).body;
  assert.equal(prof.verified, true);
});
tc('TC-59', 'FR9', 'Reject needs a reason and removes the provider from search', async ({ api, ids }) => {
  const a = await api.admin(); const c = await api.customer();
  assert.equal((await a.post(`/api/admin/applications/${ids.saman}/reject`, { reason: '' })).status, 400);
  assert.equal((await a.post(`/api/admin/applications/${ids.saman}/reject`, { reason: 'Certificate is not readable' })).status, 200);
  assert.ok(!(await c.get('/api/providers?svc=plumbing')).body.some(p => p.id === ids.saman));
});
tc('TC-60', 'NFR3', 'A provider cannot approve applications (403)', async ({ api, ids }) => {
  const p = await api.provider();
  assert.equal((await p.post(`/api/admin/applications/${ids.saman}/approve`)).status, 403);
});

/* ============ A3: complaints (FR3, FR10, FR11, NFR6) ============ */
tc('TC-61', 'FR10', 'Complaint list shows newest-open first and filters by status', async ({ api }) => {
  const a = await api.admin();
  const all = (await a.get('/api/admin/complaints')).body;
  assert.equal(all.items.length, 3);
  assert.equal(all.items[0].status, 'New');
  assert.ok((await a.get('/api/admin/complaints?status=Resolved')).body.items.every(c => c.status === 'Resolved'));
});
tc('TC-62', 'FR10 FR3', 'Resolve a complaint with a refund (Update); outcome is required (400)', async ({ api }) => {
  const a = await api.admin();
  const list = (await a.get('/api/admin/complaints?status=New')).body.items;
  const id = list.find(c => c.type === 'Price changed').id;
  assert.equal((await a.patch('/api/admin/complaints/' + id, { status: 'Resolved' })).status, 400);
  const r = await a.patch('/api/admin/complaints/' + id, { status: 'Resolved', outcome: 'Refund customer' });
  assert.equal(r.body.status, 'Resolved');
  assert.equal(r.body.outcome, 'Refund customer');
  assert.equal((await a.get('/api/admin/stats')).body.openComplaints, 1);
});
tc('TC-63', 'FR10', 'A closed complaint cannot be changed again (409)', async ({ api }) => {
  const a = await api.admin();
  const closed = (await a.get('/api/admin/complaints?status=Resolved')).body.items[0];
  assert.equal((await a.patch('/api/admin/complaints/' + closed.id, { status: 'In review' })).status, 409);
});
tc('TC-64', 'FR10', 'Add (Create) and delete (Delete) a case note on a complaint', async ({ api }) => {
  const a = await api.admin();
  const id = (await a.get('/api/admin/complaints')).body.items[0].id;
  const withNote = (await a.post(`/api/admin/complaints/${id}/notes`, { body: 'Called the customer, waiting for the quote.' })).body;
  assert.equal(withNote.notes.length, 1);
  const after = (await a.delete(`/api/admin/complaints/${id}/notes/${withNote.notes[0].id}`)).body;
  assert.equal(after.notes.length, 0);
});

/* ============ Notifications (FR8) ============ */
tc('TC-65', 'FR8', 'Notifications: unread count, mark all read (Update), delete one (Delete)', async ({ api, ids }) => {
  const p = await api.provider(); const c = await api.login('anusha@example.lk');
  await p.patch('/api/provider/requests/' + ids.reqKitchen, { status: 'accepted' });
  const n = (await c.get('/api/notifications')).body;
  assert.ok(n.unread >= 1);
  await c.post('/api/notifications/read-all');
  assert.equal((await c.get('/api/notifications')).body.unread, 0);
  assert.equal((await c.delete('/api/notifications/' + n.items[0].id)).status, 200);
});

/* ============ Privacy (NFR3) ============ */
tc('TC-66', 'NFR3 FR8', "The provider's phone number is hidden from the customer until the provider accepts", async ({ api, ids }) => {
  const c = await api.login('anusha@example.lk'); const p = await api.provider();
  const before = (await c.get('/api/bookings/' + ids.reqKitchen)).body;
  assert.equal(before.status, 'pending');
  assert.equal(before.providerPhone, null);
  await p.patch('/api/provider/requests/' + ids.reqKitchen, { status: 'accepted' });
  const after = (await c.get('/api/bookings/' + ids.reqKitchen)).body;
  assert.match(after.providerPhone, /^077 /);
});

/* ============ Search wording (FR1) ============ */
tc('TC-67', 'FR1', 'Search understands trade names such as "plumber" and "electrician"', async ({ api }) => {
  const c = await api.login('dilani@gedara.lk');
  for (const [q, trade] of [['plumber', 'plumbing'], ['electrician', 'electrical'], ['cleaner', 'cleaning']]) {
    const r = (await c.get('/api/providers?q=' + q)).body;
    assert.ok(r.length > 0, q);
    assert.ok(r.every(x => x.trade === trade), q);
  }
});

tc('TC-68', 'NFR5 FR4', 'A time slot that has already started today is not offered (past-slot rule)', async () => {
  const noon = new Date(2026, 9, 6, 12, 30); // 6 Oct 2026, 12:30
  const today = isoDate(0, noon), tomorrow = isoDate(1, noon);
  const was = process.env.HIDE_PAST_SLOTS;
  process.env.HIDE_PAST_SLOTS = '1';
  try {
    assert.equal(slotPassed(today, 0, noon), true);   // 9:00 am has gone
    assert.equal(slotPassed(today, 1, noon), true);   // 11:00 am has gone
    assert.equal(slotPassed(today, 2, noon), false);  // 2:00 pm is still ahead
    assert.equal(slotPassed(tomorrow, 0, noon), false); // other days are never "past"
  } finally { process.env.HIDE_PAST_SLOTS = was; }
});

/* ============ Usability finding UT-03: block one date only ============ */
tc('TC-69', 'FR4 FR6 NFR5', 'A one-off date block (Create, Read, Delete) hides only that date, not the same weekday next week', async ({ api, ids }) => {
  const p = await api.provider();
  const c = await api.customer();
  const date = isoDate(10), nextWeek = isoDate(17);
  const made = await p.post('/api/provider/date-blocks', { date, slot: 2 });
  assert.equal(made.status, 201);
  assert.ok((await p.get('/api/provider/blocks')).body.dateBlocks.some(x => x.date === date && x.slot === 2));
  const free = async (d) => {
    const days = (await c.get(`/api/providers/${ids.nimal}/slots?days=28`)).body;
    const day = days.find(x => x.date === d);
    return day ? day.slots[2].free : null;
  };
  assert.equal(await free(date), false);
  assert.notEqual(await free(nextWeek), false); // the same weekday a week later stays open
  assert.equal((await p.delete('/api/provider/date-blocks/' + made.body.id)).status, 200);
  assert.equal(await free(date), true);
});
tc('TC-70', 'FR4', 'A date block is not duplicated, and a past or far-future date is rejected (400)', async ({ api }) => {
  const p = await api.provider();
  const date = isoDate(5);
  await p.post('/api/provider/date-blocks', { date, slot: 1 });
  await p.post('/api/provider/date-blocks', { date, slot: 1 });
  assert.equal((await p.get('/api/provider/blocks')).body.dateBlocks.filter(x => x.date === date && x.slot === 1).length, 1);
  assert.equal((await p.post('/api/provider/date-blocks', { date: isoDate(-1), slot: 1 })).status, 400);
  assert.equal((await p.post('/api/provider/date-blocks', { date: isoDate(90), slot: 1 })).status, 400);
  assert.equal((await p.post('/api/provider/date-blocks', { date: 'tomorrow', slot: 1 })).status, 400);
});
