# Gedara usability test kit (IT3060 Milestone 03)

Kit for testing the **working app** (Expo React Native + Node/Express + SQLite) with at least 5 real participants.

| File | Purpose |
|---|---|
| `Gedara_App_Test_Session_Script.pdf` | Printable facilitator script: set-up checklist, consent, the 10 tasks with success criteria, SEQ, SUS form, post-test questions, observation sheet (landscape, print one per participant), ethics note |
| `IT3060_Milestone03_Usability_Workbook.xlsx` | Empty results workbook: Participants, Task log, SUS, Issues, Fix log, Summary (calculated), Before-After |
| `usability3.template.json` | Structure the report generator reads (all values empty) |
| `export_workbook_to_json.py` | Turns the filled workbook into `usability3.json` in that structure |
| `build/` | Python sources that regenerate the PDF and the workbook (`data3.py` holds the tasks and thresholds) |

## The rule

**Only enter real data. Never invent participants, times, ratings, issues or recordings.**
Every row in the workbook must trace back to a real session with a real person (an observation sheet, and a recording if they agreed to one). A task that was not attempted stays blank. If fewer than 5 consenting participants take part, the Summary shows "Not yet" and the report must say so. A failed task, a hint or a bad SUS score is a result, not a mistake to fix in the sheet.

## 1. Before the sessions

1. Print the PDF: all pages once, plus one observation sheet (page 9, landscape) and one SUS form (page 8) per participant.
2. Follow section A of the script. In short:
   - Start the server from `server/` with the reset switch on: `ALLOW_TEST_RESET=1 npm start` (Windows PowerShell: `$env:ALLOW_TEST_RESET=1; npm start`).
   - Start the app from `app/`: `npx expo start` (phones use Expo Go; the administrator can use `npx expo start --web` on a laptop).
   - Phone and laptop on the same Wi-Fi. If the Login screen cannot reach the server, open **Server settings** on the Login screen, enter `http://<laptop IP>:4000` and tap **Save address**. An APK always needs this.
   - Demo accounts, password `gedara123`: customer `dilani@gedara.lk`, provider `nimal@gedara.lk`, admin `ruwan@gedara.lk`.
3. Run a pilot yourself (all 10 tasks). Do not enter pilot data in the workbook.

## 2. Running a session (about 35 minutes)

1. **Reset the data before every participant**: `curl -X POST http://localhost:4000/api/test/reset` (Windows PowerShell: `curl.exe -X POST ...`). The tasks change data (bookings, complaints, approvals), so every participant must start from the same seed. Reset again when the same participant changes role (before T7 and before T9). Do not reset inside a role block: T4 needs the request made in T3.
2. Sign the device out, then sign in with the right demo account (the app remembers the last sign-in).
3. Read the consent text. **Record only if the participant says yes to recording.** Start the recording after the yes, and capture the yes.
4. Run the tasks in order T1 to T10 as far as the participant's role allows (customer T1 to T6, provider T7 and T8, administrator T9 and T10). Read each task word for word, time it, tally errors and hints, ask the SEQ question after each task, write quotes on the observation sheet.
5. SUS form, post-test questions, stop the recording.
6. Save the recording as `U<number>_<role>.mp4` (for example `U3_customer.mp4`). No names anywhere.

Participants get anonymous codes U1, U2, U3, U4, U5 and so on.

## 3. Filling the workbook (the same day)

| Sheet | What you type | What is calculated |
|---|---|---|
| Participants | Code row of the participant: real background (honest: friend or student role-playing counts as such), roles tested, age group, device, connection, date, consent, recorded, file name | Tasks attempted |
| Task log | For each task actually attempted: Outcome (Success, Partial, Fail), Time in seconds (Success only), Errors, Hints, SEQ (1 to 7), notes | none |
| SUS | The ten answers (1 to 5) | Score 0 to 100 per participant, mean |
| Issues | Each problem: task, screen, what happened, severity (High, Medium, Low), participants affected, requirement, status, Round 1 or Retest | none |
| Fix log | What was changed, date, retest result (the Issue ID, where found and severity are copied from Issues) | none |
| Summary | nothing (blue target cells only if the report changes a target) | N, success rate, median time, mean errors, mean SEQ per task, pass or fail against targets, SUS mean, issues by severity |
| Before-After | Retest numbers, only from a real retest | Round 1 numbers and the change |

Targets come from section 6.4 of the M02 report: Success at least 80 % per task, time at or under the task target, at most 2 errors per task (T1: 0 wrong turns), mean SEQ at least 5.5, mean SUS at least 68, no open High issue. **One target was adjusted: T3 time is 150 s, not 120 s**, because the working app opens the phone's photo permission prompt and gallery, which the M02 prototype did not have. All other targets are unchanged.

## 4. After the fixes

Fix the High and Medium issues, record each in the Fix log, and retest the changed tasks with real participants if possible. Enter the retest numbers in Before-After. Where a fix was only checked by the app's automated end-to-end tests, choose "Checked by automated test only" and say so in the report.

## 5. Export for the report

```
python3 export_workbook_to_json.py IT3060_Milestone03_Usability_Workbook.xlsx usability3.json
```

Only cells that were really filled in are exported (blank task rows, empty participants and unfinished SUS forms are skipped). The shape matches `usability3.template.json`.

## Known limits of the app that affect the tasks

These are app behaviours, not participant errors. Note what participants say about them.

- Photos are not uploaded: the app only records that a photo was added, and the provider sees placeholder tiles (T3, T7).
- The admin's document tiles are placeholders that cannot be opened, and there are 4 checks for 2 documents (T9).
- "Next free" and the "Today" slots ignore the time of day, so after 4 pm the app can still offer "Today 4:00 pm" (T2, T3).
- A calendar block repeats every week; a one-off absence cannot be blocked (T8). A fixed day can already hold a seeded booking, so T8 uses "the day three days from today".
- The demo data is dated "today" when it is created: always reset on the day of the sessions.
- An APK cannot find the server by itself, and Android may refuse plain `http://` in a release build: test it first, or use Expo Go.

## Regenerating the files

From `build/`: `python3 make_workbook.py` and `python3 make_script_pdf.py` (needs `reportlab` and `openpyxl`). Change tasks and thresholds in `data3.py` only.
