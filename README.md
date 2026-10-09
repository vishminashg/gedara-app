# Gedara – home-service booking app

A working mobile app (Android, iOS, web preview) where **customers** find and book plumbers, electricians and
cleaners, **providers** manage requests, availability and earnings, and an **administrator** verifies providers and
settles complaints.

Built for **IT3060 Human Computer Interaction, Milestone 03 (Mobile App Implementation & Final Evaluation)**,
SLIIT Faculty of Computing, Year 3 Semester 2, 2026. Individual submission: IT22923042, Gurusingha W S H.

The app implements the 17 interfaces of the Milestone 02 high-fidelity prototype
(customer C1–C9, provider P1–P5, administrator A1–A3) on top of a real REST API and database.

| | |
|---|---|
| Mobile app | React Native with Expo (SDK 57), React Navigation 7 |
| API | Node.js 22+ with Express 5, JSON over HTTP |
| Database | SQLite (better-sqlite3, WAL mode, foreign keys on) |
| Authentication | Email + password, bcrypt hashes, JWT bearer token (7 days) |
| Validation | zod schemas on every request body and query |
| Languages | English, Sinhala (සිංහල) and Tamil (தமிழ்), switchable in the app |
| Tests | 70 API tests (node:test + supertest) and 34 browser tests (Playwright) |

## Repository layout

```
gedara-app/
├─ server/            Express API + SQLite
│  ├─ src/            app.js, db.js (schema, rules), routes-*.js, seed.js, auth.js
│  └─ test/           api.test.js  (TC-01 … TC-70)
├─ app/               Expo app
│  ├─ src/screens/    customer/ (C1–C9), provider/ (P1–P5), admin/ (A1–A3), Auth, Notifications
│  ├─ src/            api.js, session.js, theme.js, ui.js (shared components), navigation.js, i18n.js + lang/ (Sinhala and Tamil text)
│  └─ e2e/            gedara.spec.js (UI-01 … UI-34), static.js
└─ docs/
   ├─ test-results/   JUnit XML of the last full run (API and browser)
   └─ usability/      usability test kit: session script, results workbook, README
```

## 1. Run the API

Requirements: Node.js 22 or newer (the database library ships ready-made binaries; `server/.npmrc` skips the compile step, which fails on Windows PCs without Visual Studio).

```bash
cd server
npm install
npm start            # creates gedara.db with demo data on the first run, listens on http://0.0.0.0:4000
```

Useful variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | Port of the API |
| `DB_FILE` | `server/gedara.db` | SQLite file |
| `JWT_SECRET` | development value | Set your own value for any real use |
| `ALLOW_TEST_RESET` | off | `1` enables `POST /api/test/reset`, which restores the demo data (used by the tests and the usability sessions) |
| `HIDE_PAST_SLOTS` | on | `0` stops hiding time slots that have already started today (the automated tests set this so they do not depend on the clock) |

Check it: `curl http://localhost:4000/api/health` returns `{"ok":true}`.
To start again from clean demo data: `npm run seed` (deletes and recreates the database file).

## 2. Run the app

Requirements: Node.js 22+, and either the **Expo Go** app on a phone (same Wi-Fi as the computer), an Android emulator
or iOS simulator, or just a browser.

```bash
cd app
npm install
npx expo start        # then: scan the QR code with Expo Go, press "a" for Android, "i" for iOS, "w" for web
```

The app looks for the API on the computer that runs Expo (port 4000). If it cannot connect (for example on a
university network, or with the installed APK) open **Server settings** on the Login screen and type the address, for
example `http://192.168.1.20:4000`. You can also set it at build time with `EXPO_PUBLIC_API_URL`.

### Demo accounts (password for all: `gedara123`)

| Role | Email | What to try |
|---|---|---|
| Customer | `dilani@gedara.lk` | Search "leaking tap", open Nimal Perera, book a time, chat, rebook, rate, report a problem |
| Provider | `nimal@gedara.lk` | Accept a request with a quote, block a slot, complete a job, request a payout |
| Administrator | `ruwan@gedara.lk` | Tick the four checks and approve Saman Jayasinghe; review and resolve complaint C-1038 |

The Login screen has one-tap buttons for these three accounts. More seeded customers, providers and two provider
applicants are listed in `server/src/seed.js`. New customers can register in the app.

## 3. Run the tests

```bash
# API tests (68): business rules, privacy rules and CRUD operations
cd server && npm test

# Browser tests: exports the web build, starts its own API (port 4000) and web server (port 8081)
cd app
npm run build:web
npx playwright test          # first time: npx playwright install chromium
```

Test names follow `TC-xx | requirement ids | what is checked` and `UI-xx | requirement ids | …`, so each test can be
traced to the Milestone 01 requirements (FR1–FR13, NFR1–NFR6). The last full run is stored in `docs/test-results/`.

## 4. Build an installable Android APK

**Option A – EAS (cloud build, needs a free Expo account)**

```bash
cd app
npm install -g eas-cli
eas login
eas build --platform android --profile preview     # produces an .apk download link
```

**Option B – local build (needs JDK 17+ and the Android SDK)**

```bash
cd app
npm install
npx expo prebuild --platform android
cd android
ANDROID_HOME=$HOME/Android/Sdk ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
# result: android/app/build/outputs/apk/release/app-release.apk
```

The APK allows plain `http://` traffic (`expo-build-properties`, `usesCleartextTraffic`) so it can talk to an API on
the local network. Install it on a phone, open **Server settings** on the Login screen and enter the address of the
computer that runs the API.

## 5. Features at a glance

**Customer** – search by service or in plain words ("leaking tap"), filters (verified, 4.5+, free today), provider
profile with price estimates and reviews, two-step booking with automatic draft saving, booking status and chat,
change time or cancel, history with *Book again*, rate and report, favourites, notifications.

**Provider** – accepting-jobs switch, request inbox, request details with address and phone shown only after
accepting, quote and accept/decline, mark job complete with final price, 7-day calendar with weekly blocked slots,
profile and document upload, earnings and payout requests.

**Administrator** – dashboard (7 or 30 days, notes), provider verification checklist with approve/reject,
complaint queue with status flow New → In review → Resolved/Dismissed, outcome and case notes. On a wide screen
the admin side switches to a side menu with list and detail side by side.

**Rules enforced by the API** – no double booking (409), changing the time of an accepted booking returns it to
*pending*, reviews only after a completed job, contact details hidden until accepted, a provider is listed only after
all four admin checks pass, past time slots are not offered.

## 6. Known limitations (see the report, section on deviations)

- Photos: the app lets the user pick up to five photos and stores the **count**, not the image files.
- Payments are recorded (method and price per booking, provider payouts) but there is no payment gateway.
- The provider calendar shows four weeks. A slot can be blocked for one date only or every week. There is no date range or all-day block yet.
- Push notifications are in-app only.
- Language: the whole interface (buttons, labels, messages from the server, dates and times) can be switched between English, Sinhala and Tamil with the globe button, or the language buttons on the sign-in screen. Names, the sample provider descriptions and reviews, and text that people type themselves stay as written. The Sinhala and Tamil wording was prepared with an AI tool and should be proofread by a native speaker before real use. Edit `app/src/lang/si.js` and `ta.js` to change any wording.
- The API is meant for a local network or a small deployment; there is no rate limiting or HTTPS termination.

## Licence

Coursework project. The Expo template files carry the MIT licence of 650 Industries, Inc.
