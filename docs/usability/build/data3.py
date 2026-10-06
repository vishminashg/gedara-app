"""Content shared by the M03 usability workbook and the printable session script.

Everything here was checked against the working app: server/src/seed.js, app/e2e/gedara.spec.js and app/src/screens/*.
No participant, result or recording is stored in this file: it only holds the test design.
"""

NAVY = "184F95"

# Screens (same codes as the Milestone 02 report, so issues can be mapped to the screen specification).
SCREENS = [
    "C1 Home and search", "C2 Provider results", "C3 Provider profile", "C4 Describe the job", "C5 Pick a time",
    "C6 Booking status", "C7 Chat", "C8 My bookings", "C9 Rate or report", "P1 Requests", "P2 Request details",
    "P3 Availability calendar", "P4 Profile and documents", "P5 History", "A1 Dashboard", "A2 Provider verification",
    "A3 Complaints", "Login / Register", "Notifications", "Whole app",
]

# Targets from the M02 report (section 6.4) unless marked ADJUSTED.
TARGET_SUCCESS = 0.8   # at least 80 % Success on every task
TARGET_SEQ = 5.5       # mean SEQ at least 5.5
TARGET_SUS = 68        # mean SUS at least 68
MAX_ERRORS = 2         # at most 2 errors per task (T1 keeps the stricter 0 wrong turns from data2.TASKS)

TASKS = [
    dict(id="T1", role="Customer", login="dilani@gedara.lk", start="Home",
         title="Find a trusted plumber rated 4.5+",
         read="You need a plumber for a leaking tap. Find a provider you would trust, with a rating of 4.5 or higher, and open their profile.",
         req="FR1, FR2, NFR4", time=45, errors=0, time_note="unchanged from M02: 45 s, 0 wrong turns",
         path="Home → “Plumbing” tile (or type “leaking tap” and press Search) → results list, best rated first (filters “Verified only”, “4.5 and above”, “Free today”) → tap a card.",
         success="The “Provider profile” screen of <b>Nimal Perera</b> (4.8) or <b>Kasun Fernando</b> (4.6) is open. Both are verified and rated 4.5 or more.",
         partial="Gets there only after a hint, or after opening a wrong profile and going back.",
         fail="Opens <b>Saman Jayasinghe</b> (4.3, “Not yet verified”), or is stuck for 60 s.",
         watch="What they look at to decide on trust (rating, “Verified” pill, years, reviews). Do they use the “4.5 and above” or “Verified only” chip? Do they notice that “From LKR 2,500” is not the job price?"),
    dict(id="T2", role="Customer", login="dilani@gedara.lk", start="Nimal Perera’s profile (you open it)",
         title="Price estimate and next free time",
         read="On Nimal Perera’s profile, tell me roughly what a tap repair costs and when he is next free.",
         req="FR3, FR4", time=30, errors=2, time_note="unchanged from M02: 30 s from the profile",
         path="Scroll the profile to “Price estimates” (row “Tap or mixer repair”) and to “Availability” (the hint reads “Next free: …”).",
         success="States <b>LKR 3,500 to 5,500</b> for the tap or mixer repair <u>and</u> the next free time shown on the screen. The time is dynamic: read the “Next free” line before the task and write it on the observation sheet (seeded data on the day of the reset: “Today 4:00 pm”).",
         partial="Only one of the two is right (for example quotes “from LKR 2,500”, the starting price on the button and in the results list).",
         fail="Both wrong, or stuck for 60 s.",
         watch="Do they find the range or settle for “From LKR 2,500”? Do they understand “Provider confirms the final price”? Do they use the Availability card (Today and Tomorrow rows) or the hint?"),
    dict(id="T3", role="Customer", login="dilani@gedara.lk", start="Nimal Perera’s profile (where T2 ended)",
         title="Book Nimal with a photo and a time",
         read="Book Nimal Perera for a leaking kitchen tap. Add one photo and choose a time that suits you.",
         req="FR3, FR4, FR5, FR13, NFR2, NFR5", time=150, errors=2,
         time_note="ADJUSTED from 120 s to 150 s: the working app opens the phone’s own photo permission prompt and gallery, which the M02 prototype did not have. Errors limit unchanged (2)",
         path="“Request booking from LKR 2,500” → <b>Step 1 of 2</b> “Describe the job”: chip “Leaking tap” or typed text, “Add photo” (gallery picker); address and contact number are already filled from the demo account → “Next: pick a time” → <b>Step 2 of 2</b> “Pick a time”: day chip (Today, Tomorrow and two more days), a free slot (booked slots are struck through), “Pay after the job” Cash or Card → “Send request”.",
         success="The “Your booking” screen shows <b>“Waiting for provider”</b> for Nimal Perera, and the “Photos” line on step 2 showed <b>1</b> before they pressed “Send request” (glance at it). The time they chose is the one shown under “When”.",
         partial="Request sent without a photo, or only after a hint.",
         fail="No request is sent, or stuck for 60 s.",
         watch="Photo: permission prompt, which photo, can they tell it was added? Validation message “Describe the problem so the provider can prepare.” Tapping a “Booked” slot. Do they read the pay choice and the price note? Do they understand “Step 1 of 2”?"),
    dict(id="T4", role="Customer", login="dilani@gedara.lk", start="Home (the request from T3 exists)",
         title="Ask about parking, check acceptance",
         read="You already sent a booking request. Ask the provider whether there is parking, then check whether he has accepted.",
         req="FR7, FR8, NFR3", time=60, errors=2, time_note="unchanged from M02: 60 s",
         path="“Bookings” tab → the booking card (“Upcoming”) → “Message” → type a message or tap the quick reply “Is parking available?” → Back → read the status pill. (Also valid: “Messages” tab → the conversation.)",
         success="A parking question is visible in the chat thread (typed text or the quick reply) <u>and</u> they say the request has <b>not</b> been accepted yet (“Waiting for provider”).",
         partial="Message sent but the status is wrong or unsure, or only after a hint.",
         fail="No message sent, or stuck for 60 s.",
         watch="Do they find the booking again from Home? Do they notice the lock note “Phone numbers stay hidden until the provider accepts” and “Shown after acceptance” (NFR3)? Do they expect a reply to arrive by itself?<br/><i>If T3 failed:</i> before T4, send a request yourself (Nimal, Tomorrow 2:00 pm) and write “T3 request made by facilitator” in the notes."),
    dict(id="T5", role="Customer", login="dilani@gedara.lk", start="Home",
         title="Book the same plumber again",
         read="Book the plumber who repaired your kitchen tap a few weeks ago again, for a new problem of your choice. You do not need to send it.",
         req="FR12", time=45, errors=2, time_note="unchanged from M02: 45 s",
         path="Home → “Book again” card → “Book Nimal again” (or “Bookings” → “Past” → “Book again”) → “Describe the job” opens.",
         success="<b>Step 1 of 2 “Describe the job”</b> is open for <b>Nimal Perera</b>, reached from “Book Nimal again” or from “Bookings → Past → Book again”. Stop the clock when it is on screen, then ask what they would type.",
         partial="Gets there only after a hint, or by searching for Nimal again from the results list.",
         fail="Starts a request with another provider, or stuck for 60 s.",
         watch="Do they see the “Book again” card without scrolling? Do they find it in “Bookings → Past”? The unsent request stays in “Bookings” as “Not sent”: do they notice it?"),
    dict(id="T6", role="Customer", login="dilani@gedara.lk", start="Home",
         title="Report poor work, say what happens next",
         read="The plumber who repaired your tap a few weeks ago did poor work. Report the problem and tell me what happens next.",
         req="FR10, NFR6", time=60, errors=2, time_note="unchanged from M02: 60 s",
         path="“Bookings” tab → “Past” → the completed job with Nimal Perera → “Report” → choose a reason (“Provider did not show up”, “Price changed after the job”, “Poor quality work”, “Safety or fraud concern”) → “Details” (at least 5 characters) → “Send report”.",
         success="The card <b>“Case C-#### opened”</b> is shown (a reason and details were sent) <u>and</u> they say an administrator will review it (the card says within 24 hours) and that they can follow the status.",
         partial="Case opened but they cannot say what happens next, or only after a hint.",
         fail="No report is sent, or stuck for 60 s.",
         watch="“Send report” stays disabled until a reason is chosen: do they understand why? Validation message “Tell us briefly what happened.” Do they pick “Poor quality work”? Afterwards the card in “Bookings” shows “Case C-####: New. We reply within 24 hours.”"),
    dict(id="T7", role="Provider", login="nimal@gedara.lk", start="“Requests” tab",
         title="Open a request, check it, accept it",
         read="You are a plumber. A customer, Anusha M., sent a request about a blocked kitchen drain. Open it, check the details and accept it.",
         req="FR5, FR6, FR8", time=40, errors=2, time_note="unchanged from M02: 40 s",
         path="“Requests” → card “Blocked kitchen drain · Anusha M. · Tomorrow 9:00 am · 2 photos” (pill “New”) → “Request details” (problem, photos, “Your price” already filled with 4500) → “Accept request”.",
         success="The request <b>Blocked kitchen drain</b> is <b>Accepted</b>: toast “Accepted. The customer can now see your price.”, the button “Mark job complete” appears, and the address and phone are shown.",
         partial="Accepted after a hint, or after opening the other request first.",
         fail="Accepts or declines <b>Water heater leak</b> (Rohan D.) instead, declines the drain request, or stuck for 60 s.",
         watch="Do they read problem, photos and time before accepting? There are two “New” requests, so is the right one found? Do they notice “Shown after you accept” on address and phone (NFR3)? The photos are placeholder tiles (“Photo 1”, “Photo 2”): note any comment."),
    dict(id="T8", role="Provider", login="nimal@gedara.lk", start="“Calendar” tab",
         title="Block an afternoon",
         read="You are visiting family on [say the weekday of the day three days from today] afternoon. Make sure customers cannot book you at 2 pm or 4 pm that day.",
         req="FR4, FR6, NFR5", time=45, errors=2,
         time_note="unchanged from M02: 45 s. The weekday is dynamic (M02 used Saturday): say the weekday of the day three days from today",
         path="“Calendar” (“Availability”, next 7 days) → tap the “Free” cell for 2 pm and for 4 pm on that day → the cells show “Blocked” and the toast says “Blocked every … Customers cannot book it.”",
         success="Both cells (2 pm and 4 pm on the target day) show <b>“Blocked”</b> and no other cell was changed.",
         partial="Both blocked but also blocked or unblocked another cell, or only after a hint.",
         fail="Only one slot blocked, or none, or stuck for 60 s.",
         watch="Blocks repeat every week (“Blocked every Fri”): do they notice or object? Tapping a blocked cell again unblocks it: count it as an error. Tapping a “Booked” or “Request” cell only shows a toast. Optional check at the end: customer login, Nimal, “Pick a time”: both slots show “Booked”."),
    dict(id="T9", role="Administrator", login="ruwan@gedara.lk", start="“Dashboard” (the first tab)",
         title="Check documents and approve a provider",
         read="You are the administrator. Check the documents of the new plumber Saman Jayasinghe and approve him.",
         req="FR9, NFR4", time=90, errors=2, time_note="unchanged from M02: 90 s",
         path="“Verification” tab (“Pending”, 3 applications; Saman Jayasinghe is first) → documents “National ID” and “Trade certificate” → tick the 4 checks → “Approve provider” (disabled until all four are ticked).",
         success="<b>Saman Jayasinghe</b> is approved (toast “Saman Jayasinghe approved. Now shows a verified badge.”, and he is listed under “Approved”) with all four checks ticked.",
         partial="Approved after a hint, or after opening the wrong application first.",
         fail="Approves <b>Dinesh Kumara</b> or <b>Anusha Mendis</b> by mistake, rejects Saman, or stuck for 60 s.",
         watch="The document tiles are placeholders (“National ID”, “Trade certificate”) and cannot be opened. Do participants say they cannot really check anything? There are 4 checks but 2 documents (“Photo of work is genuine”). Do they notice that “Approve provider” is disabled, and why?"),
    dict(id="T10", role="Administrator", login="ruwan@gedara.lk", start="Wherever T9 ended (“Verification”)",
         title="Resolve a price complaint, read open count",
         read="Open the complaint about a changed price and settle it by refunding the customer. Then tell me how many complaints are still open.",
         req="FR3, FR10, FR11, NFR6", time=90, errors=2, time_note="unchanged from M02: 90 s",
         path="“Complaints” tab (filters “All”, “New”, “In review”, “Resolved”) → case <b>C-1038 Price changed</b> (Rohan D. reported Kasun Fernando; first in the list and already open) → “Outcome”: <b>“Refund customer”</b> (others: Partial refund, Warn provider, Suspend provider, No action) → “Mark resolved” → “Dashboard” tab → “Open complaints”.",
         success="C-1038 is <b>Resolved</b> with outcome <b>Refund customer</b> (toast “Resolved. Both sides were notified.”) <u>and</u> they read the Dashboard count correctly: <b>one fewer than before</b> (seeded data: 2 before, <b>1</b> after). Write the count shown before the task on the observation sheet.",
         partial="Resolved with another outcome (for example “Partial refund”), or the count is wrong or was not looked up, or only after a hint.",
         fail="Resolves or dismisses a different case, or stuck for 60 s.",
         watch="“Message both sides” (moves the case to “In review”) is optional: do they think it is required? “Mark resolved” is disabled until an outcome is chosen: do they see why? “Open complaints” counts New plus In review; on the phone layout it appears twice (tile and “Needs attention”)."),
]

TASK_IDS = [t["id"] for t in TASKS]

SUS_ITEMS = [
    "I think that I would like to use this app frequently.",
    "I found the app unnecessarily complex.",
    "I thought the app was easy to use.",
    "I think that I would need the support of a technical person to be able to use this app.",
    "I found the various functions in this app were well integrated.",
    "I thought there was too much inconsistency in this app.",
    "I would imagine that most people would learn to use this app very quickly.",
    "I found the app very cumbersome to use.",
    "I felt very confident using the app.",
    "I needed to learn a lot of things before I could get going with this app.",
]

# Severity scale: Table 13 of the M02 report.
SEVERITY = [
    ("High", "Stops the participant finishing a task, leads to a wrong outcome (such as a double booking), or seriously damages trust", "Fix before the next test round"),
    ("Medium", "Slows the participant, causes hesitation or a wrong turn, but they recover; or a Low issue that affects half or more of the participants", "Fix in this iteration if time allows"),
    ("Low", "Cosmetic, wording or preference; no effect on finishing the task", "Log it; fix when convenient"),
]

ROLE_OPTIONS = "Customer,Customer + Provider,Customer + Provider + Administrator,Customer + Administrator,Provider,Administrator"
BACKGROUNDS = "Real customer,Tradesperson,Admin or office worker,Student or friend (role-playing),Other"
