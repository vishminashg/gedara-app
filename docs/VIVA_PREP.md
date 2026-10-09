# Viva preparation – Gedara (IT3060 HCI, Milestone 03)

Use this as a study sheet, not a script. Open the app and the code while you read, so every answer comes from something you have seen yourself. The viva asks you to explain **every interface, the tech stack and the testing**.

## 1. The one-minute story

Customers cannot find a plumber, electrician or cleaner they trust. Milestone 01 studied this (survey, interviews, personas, 13 functional and 6 non-functional requirements). Milestone 02 turned the requirements into 17 interfaces and a clickable high-fidelity prototype, tested with users. Milestone 03 turns the same 17 interfaces into a working mobile app: React Native (Expo) in front, a Node/Express REST API behind it, and a SQLite database. Business rules live in the API, so every client behaves the same.

## 2. Tech stack – what and why

| Layer | Choice | Why (say it in your own words) | What I rejected |
|---|---|---|---|
| App | React Native + Expo SDK 57 | One code base for Android, iOS and a browser preview; I can run it without Android Studio | Flutter (new language), native Kotlin/Swift |
| Navigation | React Navigation 7 | Standard; bottom tabs on phones, side menu on wide screens | Expo Router |
| API | Node 22 + Express 5 | Small, same language as the app | Firebase |
| Database | SQLite (better-sqlite3) | Foreign keys, unique constraints and transactions enforce the rules; no server to install | MongoDB, Postgres |
| Auth | Email + password, bcrypt hash, JWT in the header | Stateless, same on phone and web | Cookies, OAuth |
| Validation | zod on every body/query | Clear 400 messages the app shows | Hand-written checks |
| Tests | node:test + supertest (API), Playwright (browser) | Fast and repeatable | Jest/Detox |
| Build | Gradle `assembleRelease` | Local APK without an Expo account | EAS cloud build |

Be ready to say the limits honestly: photos store a count, not files; no payment gateway; in-app notifications only; APK is debug-signed and arm64 only.

## 3. The 17 interfaces – what each does and its CRUD

| Screen | Purpose | CRUD you can demonstrate |
|---|---|---|
| C1 Home/search | Search by service or plain words ("leaking tap"), book again, favourites | R search; C/D favourite |
| C2 Results | Filters (verified, 4.5+, free today), heart to save | R list; C/D favourite |
| C3 Provider profile | Price estimates, verification, reviews, free slots | R profile and slots |
| C4 Describe job | Problem, photos (count), address, phone; auto-saved draft | C draft; U draft |
| C5 Pick time + confirm | Free slot, payment method, send | U draft; submit → pending |
| C6 Booking status | Status, provider phone only after acceptance, change time, cancel | U time; U cancel |
| C7 Chat | Messages tied to a booking | C message; D own message |
| C8 My bookings | Upcoming/past, drafts, Book again | R; D draft; C rebook |
| C9 Rate / report | Review after a completed job; complaint | C review; C complaint |
| P1 Requests | Accepting-jobs switch, inbox, counts | R; U switch |
| P2 Request details | Address/phone after accepting; quote; accept/decline; complete with final price | U status, quote, price |
| P3 Availability | 7-day calendar, weekly blocked slots | C/D block |
| P4 Profile + documents | Edit profile; upload/delete documents | U profile; C/D document |
| P5 Jobs and payments | Earnings, payout request, cancel waiting payout | R; C/D payout |
| A1 Dashboard | 7/30 days stats, notes | R stats; C/D note |
| A2 Verification | Four checks, approve/reject | U checks; U approve |
| A3 Complaints | New → In review → Resolved/Dismissed, outcome, case notes | U status/outcome; C/D note |

## 4. Rules the API enforces (know where each lives)

1. **No double booking** – `slotIsFree()` in `db.js`; second booking returns 409 (TC-20, 21, 22; UI-08, 13).
2. **Past slots are not offered** – `slotPassed()` (TC-68). Accepting an existing request does not re-check it on purpose.
3. **Changing the time of an accepted booking sends it back to pending** (TC-29).
4. **Contact details hidden until accepted** – `mapReq()` in `routes-provider.js` (address, phone); customer sees provider phone only after accepted/completed (DEF1, TC-66).
5. **Review only after a completed job** (TC-34, 35).
6. **A provider is listed only after all four admin checks** (TC-57, 58).
7. **Complaint flow** New → In review → Resolved/Dismissed; resolved needs an outcome.
8. **Role check on every route** – `requireAuth(roles)`; customers can only touch their own bookings.

## 5. Testing – what to say

- **104 automated tests**: 70 API (TC-01…70) and 34 browser (UI-01…34, 390 × 844 phone viewport, one at 1280 × 800).
- Test names are `TC-xx | FR… | title`, so the traceability matrix in the report is generated from the real results, not typed by hand.
- Each requirement FR1–13 and NFR1–6 has at least one test. NFR1 (works on a phone) is supported by the browser suite plus the APK; say that a check on a real device is part of the demo.
- Defects found while building (DEF1–DEF10): privacy gap in provider phone, search missing "plumber", past slots, clipped tab labels, clipped button, wide sidebar, dashboard data, http blocked in the APK, narrow Cancel button, touch targets under 44 px. Be able to explain two of them in detail.
- **Usability testing** (section 10): ≥5 sessions, think-aloud, ten tasks, SEQ, SUS, severity High/Medium/Low. **Only talk about results you really collected.**

## 6. Deviations from the prototype (section 7, D1–D13)

Know three well: (D1) admin console on a wide screen as a side menu; (D2) photos stored as a count; (D5) calendar blocks repeat weekly. Rule of thumb: every deviation has a reason (time, scope, a finding from testing) and none removes a Milestone 01 requirement.

## 7. Likely questions

- *Walk me through booking a plumber.* C1 search → C2 results → C3 profile → C4 describe (draft saved) → C5 slot + Cash + send → pending → P1/P2 provider accepts with a quote → C6 shows accepted and the phone number.
- *Why is the logic in the API, not the app?* One source of truth; phone, browser and tests behave the same; a privacy rule cannot be bypassed by a modified client.
- *How do you stop two customers booking the same slot?* Check in `slotIsFree()` on submit and accept, plus the API returns 409; the app shows the message.
- *How is a password stored?* bcrypt hash, never plain text; JWT lasts 7 days.
- *What would you do with more time?* File storage for photos/documents, one-off calendar blocks, a payment gateway, push notifications, HTTPS and rate limiting.
- *What did testing change?* (Use the real findings from your sessions once you have them.)
- *How does the language switch work? Why not a library?* Every piece of text already goes through the shared components in `ui.js`, so they call `t()` with the English text; `i18n.js` looks it up in `lang/si.js` or `ta.js`, matches sentences with changing values (`{0}`) by pattern, and shows the original English if nothing matches. The choice is saved on the phone. I tested it with a scan that lists any English text that reaches the screen untranslated (UI-32 to UI-34). The Sinhala and Tamil wording needs proofreading by a native speaker; say that honestly.
- *Which parts did an AI tool help with?* Answer truthfully and say what you can explain and change yourself.

## 8. Before the viva – checklist

- [ ] Install the APK on a phone, open **Server settings** on the login screen, enter the API address, sign in with all three demo accounts.
- [ ] Start the API (`cd server && npm start`) and the app (`cd app && npx expo start`) once from a clean clone, using the README only.
- [ ] Run `npm test` in `server/` and `npx playwright test` in `app/`.
- [ ] Open three files and explain them line by line: `server/src/db.js` (rules), `server/src/routes-provider.js` (privacy), one screen such as `app/src/screens/customer/C5Time.js`.
- [ ] Re-read your final report in your own words, including the usability results.
