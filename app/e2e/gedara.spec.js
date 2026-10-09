// End-to-end tests of the running app (web build of the Expo project) against the real API and a freshly seeded database.
// Names follow "UI-xx | requirements | what is checked" so they map straight into the traceability matrix.
const { test, expect } = require('@playwright/test');

const API = 'http://localhost:4000';
const iso = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const tid = (page, id) => page.getByTestId(id);

test.beforeEach(async ({ request }) => { expect((await request.post(`${API}/api/test/reset`)).ok()).toBeTruthy(); });

async function signIn(page, role) {
  await page.goto('/');
  await tid(page, `demo-${role}`).click();
  await tid(page, 'login-submit').click();
}
const asNew = async (browser, role) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); await signIn(page, role); return page; };

/** Customer books Nimal tomorrow at 2 pm and returns on the booking status screen. */
async function bookNimal(page, problem = 'Kitchen tap leaking under the sink') {
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  await tid(page, 'request-booking').click();
  await tid(page, 'problem').fill(problem);
  await tid(page, 'to-time').click();
  await tid(page, 'day-1').click();
  await tid(page, 'slot-2').click();
  await tid(page, 'send-request').click();
  await expect(page.getByText('Waiting for provider')).toBeVisible();
}

test('UI-01 | FR1 FR12 | Customer signs in with a demo account and sees the home screen', async ({ page }) => {
  await signIn(page, 'customer');
  await expect(page.getByText('What needs fixing?')).toBeVisible();
  await expect(tid(page, 'svc-plumbing')).toBeVisible();
  await expect(page.getByText('Book again')).toBeVisible();
});

test('UI-02 | NFR4 NFR6 | Wrong password and empty fields are rejected with a clear message', async ({ page }) => {
  await page.goto('/');
  await tid(page, 'login-submit').click();
  await expect(page.getByText('Enter your email address.')).toBeVisible();
  await tid(page, 'login-email').fill('dilani@gedara.lk');
  await tid(page, 'login-password').fill('wrong-password');
  await tid(page, 'login-submit').click();
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
  await expect(page.getByText('Sign in').first()).toBeVisible();
});

test('UI-03 | FR1 | Searching "leaking tap" lists plumbers only, best rated first', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'search-input').fill('leaking tap');
  await tid(page, 'search-go').click();
  const cards = page.locator('[data-testid^="prov-"]');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toContainText('Nimal Perera');
  await expect(page.getByText('Chamara Silva')).toHaveCount(0);
});

test('UI-04 | FR2 FR4 | "Verified only" removes providers whose documents are not checked', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'svc-plumbing').click();
  await expect(page.getByText('Saman Jayasinghe')).toBeVisible();
  await tid(page, 'f-ver').click();
  await expect(page.getByText('Saman Jayasinghe')).toHaveCount(0);
  await expect(page.getByText('2 providers')).toBeVisible();
});

test('UI-05 | FR2 FR3 FR4 NFR4 | Profile shows verification, price estimates, availability and reviews', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  for (const t of ['Verification', 'Price estimates', 'Availability', 'Reviews', 'Identity (NIC)']) await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Verified booking').first()).toBeVisible();
});

test('UI-06 | FR3 FR5 NFR2 | An empty problem description is blocked with a message next to the field', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  await tid(page, 'request-booking').click();
  await tid(page, 'to-time').click();
  await expect(page.getByText('Describe the problem so the provider can prepare.')).toBeVisible();
  await expect(tid(page, 'send-request')).toHaveCount(0);
});

test('UI-07 | FR3 FR4 FR13 NFR3 NFR5 | Customer books a provider; request is pending and the provider phone stays locked', async ({ page }) => {
  await signIn(page, 'customer');
  await bookNimal(page);
  await expect(page.getByText('Tomorrow 2:00 pm').first()).toBeVisible();
  await expect(page.getByText('Shown after acceptance')).toBeVisible();
});

test('UI-08 | FR4 NFR5 | A slot that is already booked cannot be picked', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  await tid(page, 'request-booking').click();
  await tid(page, 'problem').fill('Blocked sink');
  await tid(page, 'to-time').click();
  await tid(page, 'day-1').click();
  await expect(tid(page, 'slot-0')).toHaveAttribute('aria-disabled', 'true');
  await expect(tid(page, 'slot-2')).not.toHaveAttribute('aria-disabled', 'true');
});

test('UI-09 | FR7 NFR3 | Customer and provider exchange a chat message', async ({ page, browser }) => {
  await signIn(page, 'customer');
  await bookNimal(page);
  await tid(page, 'message').click();
  await tid(page, 'chat-input').fill('I will be home after 3 pm');
  await tid(page, 'chat-send').click();
  await expect(page.getByText('I will be home after 3 pm')).toBeVisible();
  const prov = await asNew(browser, 'provider');
  await prov.locator('[data-testid^="req-"]').first().click();
  await prov.getByRole('button', { name: 'Suggest another time' }).click();
  await prov.getByRole('radio').first().click();
  await expect(prov.getByText('Suggestion sent in chat.')).toBeVisible();
});

test('UI-10 | FR6 FR8 NFR3 | Provider sees address and phone only after accepting', async ({ browser }) => {
  const prov = await asNew(browser, 'provider');
  await prov.locator('[data-testid^="req-"]').first().click();
  await expect(prov.getByText('Shown after you accept')).toHaveCount(2);
  await tid(prov, 'quote').fill('4500');
  await tid(prov, 'accept').click();
  await expect(prov.getByText('Shown after you accept')).toHaveCount(0);
  await expect(prov.getByText('071 555 0198')).toBeVisible();
});

test('UI-11 | FR6 FR7 FR8 | After the provider accepts, the customer sees Accepted, the price and the provider phone', async ({ page, browser }) => {
  await signIn(page, 'customer');
  await bookNimal(page);
  const prov = await asNew(browser, 'provider');
  await prov.locator('[data-testid^="req-"]').first().click();
  await tid(prov, 'quote').fill('4500');
  await tid(prov, 'accept').click();
  await expect(prov.getByText('Mark job complete')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).filter({ visible: true }).first().click();
  await tid(page, 'tab-Bookings').click();
  await page.locator('[data-testid^="bk-"]').first().click();
  await expect(page.getByText('Nimal accepted and confirmed the price: LKR 4,500.')).toBeVisible();
  await expect(page.getByText('077 100 0000')).toBeVisible();
});

test('UI-12 | FR6 FR13 | Provider completes a job with a final price and it appears in History', async ({ browser }) => {
  const prov = await asNew(browser, 'provider');
  await prov.locator('[data-testid^="req-"]').first().click();
  await tid(prov, 'quote').fill('4500');
  await tid(prov, 'accept').click();
  await tid(prov, 'complete').click();
  await tid(prov, 'final-price').fill('4800');
  await tid(prov, 'confirm-complete').click();
  await expect(prov.getByText('Job recorded under History.')).toBeVisible();
  await prov.getByRole('button', { name: 'Back' }).first().click();
  await tid(prov, 'tab-History').click();
  await expect(prov.getByText('LKR 4,800').first()).toBeVisible();
  await expect(prov.getByText('Jobs completed')).toBeVisible();
});

test('UI-13 | FR4 FR6 NFR5 | A slot the provider blocks cannot be booked by a customer', async ({ page, browser }) => {
  const prov = await asNew(browser, 'provider');
  await tid(prov, 'tab-Calendar').click();
  await tid(prov, `cell-${iso(1)}-3`).click();
  await expect(prov.getByText(/Blocked on .* only/)).toBeVisible();
  await signIn(page, 'customer');
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  await tid(page, 'request-booking').click();
  await tid(page, 'problem').fill('Leaking tap');
  await tid(page, 'to-time').click();
  await tid(page, 'day-1').click();
  await expect(tid(page, 'slot-3')).toHaveAttribute('aria-disabled', 'true');
});

test('UI-30 | FR4 FR6 NFR5 | A provider can block one date in a later week and customers see only that date blocked', async ({ browser, page }) => {
  const prov = await asNew(browser, 'provider');
  await tid(prov, 'tab-Calendar').click();
  await tid(prov, 'week-later').click();
  await tid(prov, `cell-${iso(10)}-3`).click();
  await expect(prov.getByText(/Blocked on .* only/)).toBeVisible();
  await signIn(page, 'customer');
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  await tid(page, 'request-booking').click();
  await tid(page, 'problem').fill('Leaking tap');
  await tid(page, 'to-time').click();
  await tid(page, 'days-later').click();
  await tid(page, 'day-10').click();
  await expect(tid(page, 'slot-3')).toHaveAttribute('aria-disabled', 'true');
  await tid(page, 'day-9').click();
  await expect(tid(page, 'slot-3')).not.toHaveAttribute('aria-disabled', 'true');
});

test('UI-14 | FR10 NFR6 | Customer rates a completed job', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'tab-Bookings').click();
  await page.getByRole('button', { name: 'Past' }).click();
  await page.getByRole('button', { name: 'Rate', exact: true }).first().click();
  await expect(tid(page, 'submit-review')).toBeDisabled();
  await tid(page, 'star-5').click();
  await page.getByRole('button', { name: 'On time' }).click();
  await tid(page, 'submit-review').click();
  await expect(page.getByText('Review sent')).toBeVisible();
});

test('UI-15 | FR10 FR3 NFR6 | Customer reports a problem and gets a case reference', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'tab-Bookings').click();
  await page.getByRole('button', { name: 'Past' }).click();
  await page.getByRole('button', { name: 'Report', exact: true }).first().click();
  await expect(tid(page, 'submit-report')).toBeDisabled();
  await page.getByRole('radio', { name: 'Price changed after the job' }).click();
  await tid(page, 'submit-report').click();
  await expect(page.getByText('Tell us briefly what happened.')).toBeVisible();
  await tid(page, 'report-detail').fill('Asked for more than quoted');
  await tid(page, 'submit-report').click();
  await expect(page.getByText(/Case C-\d+ opened/)).toBeVisible();
});

test('UI-16 | FR9 | Provider edits the profile and the change is saved', async ({ browser }) => {
  const prov = await asNew(browser, 'provider');
  await tid(prov, 'tab-Me').click();
  await tid(prov, 'edit-profile').click();
  await prov.getByLabel('Prices from (LKR)').fill('2800');
  await tid(prov, 'save-profile').click();
  await expect(prov.getByText('Profile saved.')).toBeVisible();
  await expect(prov.getByText('LKR 2,800')).toBeVisible();
});

test('UI-17 | FR9 NFR4 | Admin cannot approve until all four checks are ticked, then the provider is verified', async ({ browser }) => {
  const adm = await asNew(browser, 'admin');
  await tid(adm, 'tab-Verification').click();
  const approve = adm.locator('[data-testid^="approve-"]').first();
  await expect(approve).toBeDisabled();
  for (let i = 0; i < 4; i++) await adm.getByRole('checkbox').nth(i).click();
  await expect(approve).toBeEnabled();
  await approve.click();
  await expect(adm.getByText(/approved\. Now shows a verified badge/i)).toBeVisible();
});

test('UI-18 | FR3 FR10 NFR6 | Admin contacts both sides, then resolves a complaint with an outcome', async ({ browser }) => {
  const adm = await asNew(browser, 'admin');
  await tid(adm, 'tab-Complaints').click();
  await expect(tid(adm, 'resolve-C-1038')).toBeDisabled();
  await tid(adm, 'review-C-1038').click();
  await expect(adm.getByText('Both sides messaged. Case is in review.')).toBeVisible();
  await adm.getByRole('radio', { name: 'Warn provider' }).click();
  await tid(adm, 'resolve-C-1038').click();
  await expect(adm.getByText('Resolved. Both sides were notified.')).toBeVisible();
});

test('UI-19 | FR11 | Admin dashboard shows the counts and switches between 7 and 30 days', async ({ browser }) => {
  const adm = await asNew(browser, 'admin');
  for (const t of ['Bookings', 'Cancellations', 'Open complaints', 'Active providers', 'Provider ratings watchlist']) await expect(adm.getByText(t, { exact: true }).first()).toBeVisible();
  await tid(adm, 'range-30').click();
  await expect(adm.getByText('last 30 days')).toBeVisible();
});

test('UI-20 | FR12 NFR6 | A new customer registers, lands on Home and can sign out', async ({ page }) => {
  await page.goto('/');
  await tid(page, 'go-register').click();
  await tid(page, 'reg-name').fill('Test Customer');
  await tid(page, 'reg-email').fill('test.customer@example.lk');
  await tid(page, 'reg-password').fill('secret12');
  await tid(page, 'reg-submit').click();
  await expect(page.getByText('What needs fixing?')).toBeVisible();
  await tid(page, 'signout').click();
  await expect(page.getByText('Create an account')).toBeVisible();
});

test('UI-21 | FR12 NFR4 | Registering with an email that is already used shows an error', async ({ page }) => {
  await page.goto('/');
  await tid(page, 'go-register').click();
  await tid(page, 'reg-name').fill('Dilani Again');
  await tid(page, 'reg-email').fill('dilani@gedara.lk');
  await tid(page, 'reg-password').fill('secret12');
  await tid(page, 'reg-submit').click();
  await expect(page.getByText('That email is already registered.')).toBeVisible();
});

test('UI-22 | FR12 | "Book again" on Home opens the job form for the same provider', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'rebook').click();
  await expect(page.getByText('Describe the job').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Nimal Perera').filter({ visible: true }).first()).toBeVisible();
});

test('UI-23 | FR7 NFR5 | Cancelling a pending request releases the slot', async ({ page }) => {
  await signIn(page, 'customer');
  await bookNimal(page);
  await tid(page, 'cancel').click();
  await page.getByRole('radio', { name: 'Found someone else' }).click();
  await expect(page.getByText('Request cancelled.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).filter({ visible: true }).first().click();
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  await tid(page, 'request-booking').click();
  await tid(page, 'problem').fill('Leaking tap');
  await tid(page, 'to-time').click();
  await tid(page, 'day-1').click();
  await expect(tid(page, 'slot-2')).not.toHaveAttribute('aria-disabled', 'true');
});

test('UI-24 | FR8 | Notifications: provider is told about a new request and can mark it read', async ({ page, browser }) => {
  await signIn(page, 'customer');
  await bookNimal(page);
  const prov = await asNew(browser, 'provider');
  await prov.getByRole('button', { name: 'Notifications' }).click();
  await expect(prov.getByText(/New request:/).first()).toBeVisible();
  await prov.getByRole('button', { name: /Mark \d+ as read/ }).click();
  await expect(prov.getByText('All caught up')).toBeVisible();
});

test('UI-25 | FR1 FR2 | Customer saves a provider from the results list and finds it under favourites on Home', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="fav-"]').first().click();
  await page.getByRole('button', { name: 'Back' }).filter({ visible: true }).first().click();
  await expect(page.getByText('Your favourites')).toBeVisible();
});

test('UI-26 | FR7 NFR3 | Customer deletes a message they sent', async ({ page }) => {
  await signIn(page, 'customer');
  await bookNimal(page);
  await tid(page, 'message').click();
  await tid(page, 'chat-input').fill('Wrong message');
  await tid(page, 'chat-send').click();
  await expect(page.getByText('Wrong message')).toBeVisible();
  await page.locator('[data-testid^="del-msg-"]').first().click();
  await expect(page.getByText('Wrong message')).toHaveCount(0);
});

test('UI-27 | FR5 FR12 | A booking left unsent is kept as a draft that can be deleted', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  await tid(page, 'request-booking').click();
  await tid(page, 'problem').fill('Leaking tap in the garden');
  await tid(page, 'to-time').click();
  await expect(tid(page, 'day-1')).toBeVisible();
  await page.reload(); // the saved sign-in brings the customer back to Home; the unsent request is kept on the server
  await tid(page, 'tab-Bookings').click();
  await expect(page.getByText('Not sent')).toBeVisible();
  await page.locator('[data-testid^="delete-"]').first().click();
  await expect(page.getByText('Not sent')).toHaveCount(0);
});

test('UI-28 | FR5 NFR2 | A draft can be continued and sent', async ({ page }) => {
  await signIn(page, 'customer');
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  await tid(page, 'request-booking').click();
  await tid(page, 'problem').fill('Dripping shower head');
  await tid(page, 'to-time').click();
  await page.reload(); // the saved sign-in brings the customer back to Home; the unsent request is kept on the server
  await tid(page, 'tab-Bookings').click();
  await page.locator('[data-testid^="resume-"]').first().click();
  await expect(tid(page, 'problem')).toHaveValue('Dripping shower head');
  await tid(page, 'to-time').click();
  await tid(page, 'day-1').click();
  await tid(page, 'slot-3').click();
  await tid(page, 'send-request').click();
  await expect(page.getByText('Waiting for provider')).toBeVisible();
});

test('UI-29 | NFR1 FR9 | Admin on a wide screen shows a side menu and a list beside the detail', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await signIn(page, 'admin');
  const nav = tid(page, 'tab-Verification');
  await expect(nav).toBeVisible();
  const box = await nav.boundingBox();
  expect(box.x).toBeLessThan(40); // the menu is on the left, not along the bottom
  await nav.click();
  await expect(page.locator('[data-testid^="app-"]').first()).toBeVisible();
  await expect(tid(page, 'approve-' + (await page.locator('[data-testid^="approve-"]').first().getAttribute('data-testid')).split('-')[1])).toBeVisible();
  await ctx.close();
});

/* ---------- Language: English, Sinhala, Tamil (usability finding UT-05, requirement NFR2) ---------- */

/** Opens a fresh browser tab in the given language and records any English text that reached the screen without a translation. */
async function inLanguage(browser, lang, role, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript((l) => { window.__gedaraMissing = new Set(); try { localStorage.setItem('gedara.lang', l); } catch (e) { /* ignore */ } }, lang);
  const page = await ctx.newPage();
  await page.goto('/');
  if (role) { await tid(page, `demo-${role}`).click(); await tid(page, 'login-submit').click(); }
  return { page, ctx };
}
/** Names, sample text and file names are data, not interface text, so they are allowed to stay in English. */
const DATA_TEXT = [/^LKR [\d,]+/, /\.(pdf|jpg)$/i, /^English$/, /Galle Road/, /^Review the two electrician/, /^[A-Z][a-z]+ [A-Z][a-z.]+/,
  /^(Kitchen sink drains|Arrived at the time|Explained the problem|Good work, ten|Licensed plumber|Light fitting came|The provider did not arrive|Kitchen tap leaking|Quoted LKR|Certified electrician|Lighting and small|Independent plumber|Careful, detail|Team of four|New to the platform|New applicant)/, /^Sparkle Home Crew/];
const untranslated = async (page) => (await page.evaluate(() => [...window.__gedaraMissing])).filter((x) => !DATA_TEXT.some((re) => re.test(x)));

test('UI-31 | NFR2 | The sign-in screen can be switched to Sinhala and Tamil, and the choice is remembered', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await tid(page, 'lang-si').click();
  await expect(page.getByRole('heading', { name: 'පිවිසෙන්න' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'පිවිසෙන්න' })).toBeVisible(); // still Sinhala after a restart
  await tid(page, 'lang-ta').click();
  await expect(page.getByRole('heading', { name: 'உள்நுழை' })).toBeVisible();
  await tid(page, 'lang-en').click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('UI-32 | NFR2 FR1 FR3 FR4 | A customer can search, choose a time and send a request entirely in Sinhala', async ({ browser }) => {
  const { page, ctx } = await inLanguage(browser, 'si', null);
  await tid(page, 'login-submit').click();
  await expect(page.getByText('ඔබේ විද්‍යුත් තැපැල් ලිපිනය ඇතුළත් කරන්න.')).toBeVisible(); // validation message in Sinhala
  await tid(page, 'login-email').fill('dilani@gedara.lk');
  await tid(page, 'login-password').fill('wrong-password');
  await tid(page, 'login-submit').click();
  await expect(page.getByText('විද්‍යුත් තැපෑල හෝ මුරපදය වැරදියි.')).toBeVisible(); // a message that comes from the server is translated too
  await tid(page, 'demo-customer').click();
  await tid(page, 'login-submit').click();
  await expect(page.getByText('මොනවාද අලුත්වැඩියා කළ යුත්තේ?')).toBeVisible();
  await tid(page, 'svc-plumbing').click();
  await page.locator('[data-testid^="prov-"]').first().click();
  await tid(page, 'request-booking').click();
  await tid(page, 'problem').fill('Kitchen tap leaking under the sink');
  await tid(page, 'to-time').click();
  await tid(page, 'day-1').click();
  await expect(tid(page, 'slot-2')).toContainText(/ප\.ව\./); // 2:00 pm is written the Sinhala way
  await tid(page, 'slot-2').click();
  await tid(page, 'send-request').click();
  await expect(page.getByText('සේවා සපයන්නා එනතුරු රැඳී සිටී')).toBeVisible();
  await expect(tid(page, 'cancel')).toContainText('ඉල්ලීම අවලංගු කරන්න');
  expect(await untranslated(page)).toEqual([]);
  await ctx.close();
});

test('UI-33 | NFR2 FR6 FR9 | Provider and admin screens work in Tamil', async ({ browser }) => {
  const prov = await inLanguage(browser, 'ta', 'provider');
  await expect(prov.page.getByText('புதிய வேலைகளை ஏற்கிறேன்')).toBeVisible();
  await prov.page.locator('[data-testid^="req-"]').first().click();
  await expect(prov.page.getByText('கோரிக்கை விவரங்கள்')).toBeVisible();
  await expect(tid(prov.page, 'accept')).toContainText('கோரிக்கையை ஏற்றுக்கொள்');
  await prov.page.getByRole('button', { name: 'பின்செல்' }).first().click();
  await tid(prov.page, 'tab-Calendar').click();
  await expect(tid(prov.page, 'block-date')).toHaveText('இந்த தேதி மட்டும்');
  await tid(prov.page, 'tab-History').click();
  await expect(prov.page.getByText('வேலைகள் மற்றும் கட்டணங்கள்')).toBeVisible();
  await tid(prov.page, 'tab-Me').click();
  await expect(prov.page.getByText('சுயவிவரம் மற்றும் ஆவணங்கள்')).toBeVisible();
  expect(await untranslated(prov.page)).toEqual([]);
  await prov.ctx.close();

  const adm = await inLanguage(browser, 'ta', 'admin');
  await expect(adm.page.getByText('முகப்புப் பலகை').first()).toBeVisible();
  await tid(adm.page, 'tab-Verification').click();
  await expect(adm.page.getByText('சேவை வழங்குநர் சரிபார்ப்பு').first()).toBeVisible();
  await tid(adm.page, 'tab-Complaints').click();
  await expect(adm.page.getByText('புகார்கள்').first()).toBeVisible();
  await adm.page.locator('[data-testid^="case-C-"]').first().click();
  await expect(adm.page.getByText('ஆதாரம்').first()).toBeVisible();
  expect(await untranslated(adm.page)).toEqual([]);
  await adm.ctx.close();
});

test('UI-34 | NFR2 | The language can be changed from the home screen and every screen follows it', async ({ browser }) => {
  const { page, ctx } = await inLanguage(browser, 'en', 'customer');
  await expect(page.getByText('What needs fixing?')).toBeVisible();
  await tid(page, 'lang-button').click();
  await tid(page, 'lang-si').click();
  await tid(page, 'lang-done').click();
  await expect(page.getByText('මොනවාද අලුත්වැඩියා කළ යුත්තේ?')).toBeVisible();
  await tid(page, 'tab-Bookings').click();
  await expect(page.getByText('මගේ වෙන්කිරීම්').first()).toBeVisible();
  await tid(page, 'tab-Messages').click();
  await expect(page.getByText('පණිවිඩ').first()).toBeVisible();
  expect(await untranslated(page)).toEqual([]);
  await ctx.close();
});
