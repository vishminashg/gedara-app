"""Builds Gedara_App_Test_Session_Script.pdf: printable facilitator script for the usability test of the WORKING Gedara app.

Run:  python3 make_script_pdf.py [output.pdf]
Same look as the M02 script (navy #184f95 headings, Helvetica). Nothing in it is a result: all answer cells are blank.
"""
import re, sys
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, NextPageTemplate, PageBreak, Paragraph, Table,
                                TableStyle, Spacer, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import data3 as D

OUT = sys.argv[1] if len(sys.argv) > 1 else "Gedara_App_Test_Session_Script.pdf"
pdfmetrics.registerFont(TTFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))

NAVY = colors.HexColor("#184f95"); SOFT = colors.HexColor("#f2f5fa"); GRID = colors.HexColor("#d9dde5")
YEL = colors.HexColor("#fff4c2"); GREY = colors.HexColor("#52514e")
B = ParagraphStyle("b", fontName="Helvetica", fontSize=9, leading=12.2)
BS = ParagraphStyle("bs", parent=B, fontSize=8.4, leading=11)
H1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=NAVY, spaceAfter=3)
H2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=NAVY, spaceBefore=8, spaceAfter=3)
H3 = ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=NAVY, spaceBefore=5, spaceAfter=2)
SM = ParagraphStyle("sm", parent=B, fontSize=8, leading=10.5, textColor=GREY)
HD = ParagraphStyle("hd", parent=B, fontName="Helvetica-Bold", textColor=colors.white)
HDS = ParagraphStyle("hds", parent=HD, fontSize=8.4, leading=10.5)
CODE = ParagraphStyle("code", fontName="Courier", fontSize=8.2, leading=10.4, backColor=colors.HexColor("#f4f4f1"), borderPadding=(2, 3, 2, 3), spaceBefore=2, spaceAfter=3)
CELL = ParagraphStyle("cell", parent=B, fontSize=8.4, leading=10.8)
CTR = ParagraphStyle("ctr", parent=CELL, alignment=1)

PW = 176 * mm       # portrait text width
GLYPH = re.compile("([≤≥→☐✓≈×])")


def fx(t):
    """Standard Helvetica lacks a few symbols: draw those from DejaVu."""
    return GLYPH.sub(r'<font name="DejaVu">\1</font>', t)


def P(t, s=B):
    return Paragraph(fx(t), s)


def tbl(rows, head=("YOU SAY (facilitator)", "PARTICIPANT DOES / SAYS (their own words)"), widths=(88 * mm, 88 * mm)):
    data = [[P(head[0], HD), P(head[1], HD)]] + [[P(a), P(b)] for a, b in rows]
    t = Table(data, colWidths=list(widths), repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.4, GRID), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("BACKGROUND", (0, 1), (0, -1), SOFT), ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5)]))
    return t


def checklist(items):
    data = [[Paragraph('<font name="DejaVu">☐</font>', B), P(x)] for x in items]
    t = Table(data, colWidths=[7 * mm, PW - 7 * mm])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.3, GRID),
                           ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("LEFTPADDING", (0, 0), (0, -1), 2)]))
    return t


def box(text, bg=YEL, style=BS):
    t = Table([[P(text, style)]], colWidths=[PW])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.5, GRID),
                           ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4), ("LEFTPADDING", (0, 0), (-1, -1), 6)]))
    return t


def code(t):
    return Paragraph(t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>"), CODE)


S = []

# =================================================================== Page 1: title and set-up
S.append(P("Usability test session script – Gedara working app", H1))
S.append(P("IT3060 Milestone 03 · Facilitator: IT22923042 · Read the left column word for word. The right column says what the participant does; their answers must be their own, real answers. "
           "Nothing in this script is a result: write only what you really see and hear.", SM))
S.append(Spacer(1, 4))
hdr = Table([[P("<b>Participant code</b> U____", CELL), P("<b>Role(s)</b> Customer / Provider / Admin", CELL), P("<b>Date</b> ________", CELL), P("<b>Device</b> ________", CELL)]],
            colWidths=[40 * mm, 62 * mm, 36 * mm, 38 * mm])
hdr.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.5, GRID), ("INNERGRID", (0, 0), (-1, -1), 0.3, GRID), ("BACKGROUND", (0, 0), (-1, -1), YEL), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
S.append(hdr)

S.append(P("A. Set-up checklist", H2))
S.append(P("A1. Once, on the day of the sessions (allow 30 minutes)", H3))
S.append(checklist([
    "<b>Start the server</b> from the <i>server</i> folder, with the test-reset switch on (Node 20 or newer):",
]))
S.append(code("macOS / Linux :  ALLOW_TEST_RESET=1 npm start\nWindows (PowerShell) :  $env:ALLOW_TEST_RESET=1; npm start"))
S.append(P("It prints “Gedara API listening on http://0.0.0.0:4000”. Without <font face='Courier'>ALLOW_TEST_RESET=1</font> the reset address does not exist. In that case stop the server, run <font face='Courier'>npm run seed</font> "
           "(deletes the database and creates fresh demo data) and run <font face='Courier'>npm start</font> again between participants.", BS))
S.append(checklist([
    "<b>Reset the data on the same day</b> (see A2 step 1). The demo bookings are dated “today” when they are created, so data created yesterday shows the wrong “Today” slots and the wrong “Next free”.",
    "<b>Start the app</b> from the <i>app</i> folder: <font face='Courier'>npx expo start</font>. Laptop and phone must be on the same Wi-Fi (or the laptop’s hotspot). For the administrator on a laptop use <font face='Courier'>npx expo start --web</font> and open the address it prints (usually http://localhost:8081): the wide window shows the desktop layout with a side menu.",
    "<b>Find the laptop’s IP address</b> (<font face='Courier'>ipconfig</font> on Windows, <font face='Courier'>ifconfig</font> on macOS or Linux), for example 192.168.1.20. Open <font face='Courier'>http://192.168.1.20:4000/api/health</font> in the phone’s browser: it must show {\"ok\":true}. If not, the laptop firewall is blocking port 4000 or the phone is on another network.",
    "<b>Connect the phone.</b> <u>Expo Go:</u> scan the QR code from the Expo terminal; the app finds the server by itself (laptop address, port 4000). <u>APK</u> (EAS build profile “preview” makes an APK): install it, then <b>always</b> set the address by hand, because an APK cannot guess it.",
    "<b>If the Login screen shows “Cannot reach the Gedara server…”:</b> scroll to the bottom of the Login screen, tap <b>Server settings</b>, type <font face='Courier'>http://192.168.1.20:4000</font> (your laptop’s address) into <b>Server address</b>, tap <b>Save address</b>. The line “Saved. Using …” confirms it. Android may refuse plain http:// in an APK: test this before the first participant. If it fails, use Expo Go.",
    "<b>Photos for T3:</b> put 3 harmless pictures in the phone’s gallery (an object, a tap, a sink: no people, no faces, no personal information). Decide whether participants use <u>their own phone</u> (they meet the real permission prompt) or <u>your test phone</u> (grant access beforehand) and keep to one choice. Write it on every observation sheet.",
    "<b>Recording:</b> test screen recording with microphone (iPhone: Control Centre, long-press record, microphone on; Android: built-in screen recorder with microphone; laptop or video call: share screen and record). Check free storage. Do not start recording before consent.",
    "<b>Print:</b> this script, plus per participant one observation sheet (landscape) and one SUS form. Bring a pen and a timer (phone stopwatch).",
    "<b>Pilot:</b> do all ten tasks yourself once, following the criteria below. Never put pilot data in the workbook.",
]))
S.append(PageBreak())

S.append(P("A2. Before every participant", H3))
S.append(checklist([
    "<b>Reset the demo data.</b> In a terminal on the laptop:",
]))
S.append(code("curl -X POST http://localhost:4000/api/test/reset\nWindows PowerShell:  curl.exe -X POST http://localhost:4000/api/test/reset"))
S.append(P("The answer is {\"ok\":true}. Every booking, request, complaint, block and approval made earlier is gone and the seed data (dated today) is back. Saved sign-ins stay valid.", BS))
S.append(checklist([
    "<b>Sign the device out</b> (the app remembers the last sign-in, so the previous role is still open): Customer: Home → scroll down → “Sign out (Dilani)”. Provider: “Profile” tab → “Sign out”. Admin: Dashboard → log-out icon, top right.",
    "<b>Sign in for the participant</b> with the demo account for the role (table below): tap the chip under “Demo accounts” (Customer, Provider or Admin), then “Sign in”. Signing in is set-up, not a task: do it yourself, but note if they would have hesitated. The password is <b>gedara123</b>.",
    "<b>Read the changing values off the screen</b> and write them on the observation sheet: (a) Nimal’s “Next free” line, from his profile (for T2); (b) the weekday three days from today (for T8); (c) the “Open complaints” number on the admin Dashboard before T10 (2 after a reset).",
    "Phone on silent and “Do not disturb”, brightness up, other apps closed. Start the stopwatch only when you finish reading a task.",
]))
S.append(Spacer(1, 3))
S.append(box("<b>Why reset so often.</b> The tasks change data: T3 books a slot, T6 opens a complaint (it would become the first case in the admin list and add one to the open count in T10), T7 accepts a request, T9 approves Saman. "
             "Reset at the start of every participant <b>and</b> whenever the same participant changes role: before T7 (customer to provider) and before T9 (provider to administrator), then sign out and sign in with the next account. "
             "<b>Do not reset in the middle of a role block</b>: T4 needs the request made in T3."))
S.append(P("A3. Demo accounts and seeded data (facilitator reference: do not tell the participant)", H3))
acc = [[P("Role", HDS), P("Login (password gedara123)", HDS), P("Tasks", HDS), P("What the seed gives you", HDS)],
       [P("Customer", CELL), P("dilani@gedara.lk<br/>Dilani Perera", CELL), P("T1 to T6", CELL),
        P("Address and phone are pre-filled. One finished job: Tap or mixer repair with Nimal Perera, LKR 4,200, 24 days before the reset day (the date shown in “Bookings → Past” moves with the reset day). No other booking.", CELL)],
       [P("Provider", CELL), P("nimal@gedara.lk<br/>Nimal Perera", CELL), P("T7, T8", CELL),
        P("Two “New” requests: <b>Blocked kitchen drain</b> (Anusha M., Tomorrow 9:00 am, 2 photos, price 4500) and <b>Water heater leak</b> (Rohan D., day after tomorrow 2:00 pm, price 8000). Booked: Today 9:00 am, 11:00 am, 2:00 pm and Tomorrow 11:00 am. Sunday 9:00 am is blocked.", CELL)],
       [P("Admin", CELL), P("ruwan@gedara.lk<br/>Ruwan Jayawardena", CELL), P("T9, T10", CELL),
        P("3 pending applications: Saman Jayasinghe, Dinesh Kumara, Anusha Mendis. Complaints: C-1038 Price changed (New), C-1039 No-show (In review), C-1035 Poor quality (Resolved): <b>Open complaints = 2</b>.", CELL)]]
t = Table(acc, colWidths=[18 * mm, 38 * mm, 16 * mm, PW - 72 * mm])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.4, GRID), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 1), (0, -1), SOFT),
                       ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
S.append(t)
S.append(Spacer(1, 3))
S.append(P("<b>Plumbers in the results (best rated first):</b> Nimal Perera 4.8 (verified, “From LKR 2,500”; Tap or mixer repair LKR 3,500 to 5,500), Kasun Fernando 4.6 (verified), Saman Jayasinghe 4.3 (“Not yet verified”). "
           "Next free for Nimal on the reset day: “Today 4:00 pm”. “Pick a time” shows 4 days (Today, Tomorrow and two more); the provider Calendar shows 7 days.", BS))
S.append(P("<b>Things to know so you can stay quiet:</b> photos are not uploaded (the app records only that a photo was added; the provider sees placeholder tiles); the admin’s document tiles are placeholders that cannot be opened; "
           "“Next free” ignores the time of day, so after 4 pm it can still say “Today 4:00 pm”; a calendar block repeats every week. These are app limits, not participant errors: note what the participant says about them.", BS))

# =================================================================== B. Opening, consent, background
S.append(P("B. Opening and consent (4 min)", H2))
S.append(tbl([
    ("“Hi, thanks for helping. Can you hear me, and is this phone (or laptop) comfortable to use?”", "Confirms."),
    ("“I’m testing a working version of a home-service booking app called Gedara for my university course, IT3060 at SLIIT. It tests the app, not you. You can’t do anything wrong. I built this app myself, so please be honest: you won’t hurt my feelings.”", "Listens."),
    ("“Please think out loud: tell me what you see, what you expect to happen and anything that confuses you. I won’t help during the tasks, but I’ll be listening. You can stop at any time without giving a reason.”", "Listens, may ask questions."),
    ("“Everything in the app is invented: the people, the prices, the bookings. Nothing is sent or paid. If you choose a photo, it stays on your phone. Please don’t type any real personal details.”", "Listens."),
    ("“Two questions. First: do you agree to take part? You can stop at any time, and ask me afterwards to delete your results.” <b>Tick on the observation sheet.</b>", "Says <b>Yes</b> or <b>No</b> in their own words. If No: thank them and stop."),
    ("“Second: may I record your screen and your voice, only so I can check my notes? You will appear only as <b>U__</b>. Please don’t say your surname, phone number or address. The recording will be seen by <b>[tick the true one]</b> <font name='DejaVu'>☐</font> only me and the people who mark my coursework, <font name='DejaVu'>☐</font> anyone with the link, because my assessors open it that way. I may quote your comments without your name. You can ask me to delete it until I submit.”",
     "Says <b>Yes</b> or <b>No</b>. If No: <b>no recording</b>, take written notes only; they can still take part."),
    ("<i>Only if Yes:</i> start the recording. “The recording is running. Please say ‘yes, I agree’ once more so it is on the recording.”", "Says it. (Delete the clip if they change their mind.)"),
]))
S.append(P("C. Background questions (2 min): write the answers on the observation sheet", H2))
S.append(tbl([
    ("“Which age group are you in: 18 to 24, 25 to 34, 35 to 44, 45 to 54, or 55 and over?”", "Age group. (Adults only: do not test anyone under 18.)"),
    ("“Which phone or computer are you using today?”", "Device."),
    ("“In the last year, how often did you hire a plumber, electrician or cleaner?”", "Own answer."),
    ("“How do you usually find them: a relative, a neighbour, social media, an advert, or something else?”", "Own answer."),
    ("<i>Providers only:</i> “What is your trade, and how do you take bookings now?” <i>Administrators only:</i> “Have you ever checked someone’s documents or handled a complaint?”", "Own answer."),
]))
S.append(PageBreak())

# =================================================================== D. Tasks
S.append(P("D. Tasks (about 20 to 25 min)", H2))
S.append(P("Customer tasks T1 to T6, then provider T7 and T8, then administrator T9 and T10, as the participant’s time and role allow. Not every participant has to do every role: "
           "<b>log only the tasks that were really attempted</b> and say on the Participants sheet if someone role-played a provider or an administrator.", BS))
S.append(Spacer(1, 3))
rules = [
    ("<b>Start.</b> Say “Please start from [start screen]” if needed, read the task word for word, start the timer when you finish reading. Say nothing else.",
     "<b>Stop.</b> Stop the timer when the goal screen is on screen or the participant says they are done. Time counts for Success only."),
    ("<b>Stuck.</b> If the participant is stuck for 60 seconds say “Let’s move on” and mark <b>Fail</b>. If they ask for help say “What would you do if I weren’t here?”.",
     "<b>Outcome.</b> <b>Success</b> = done unaided. <b>Partial</b> = done after a hint or a detour. <b>Fail</b> = not done. Any hint you give: tally it as H."),
    ("<b>Error</b> = a tap that leads away from the goal, an error or validation message the participant triggers, or going back to undo something. Tally each on the sheet.",
     "<b>Not an error.</b> A crash, a network message or a slow answer from the server is a fault of the app: write “tech fault”, reset if needed and repeat the task. Do not count it."),
]
rt = Table([[P(a, CELL), P(b, CELL)] for a, b in rules], colWidths=[PW / 2, PW / 2])
rt.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.4, GRID), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (-1, -1), SOFT), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
S.append(rt)
S.append(Spacer(1, 3))
S.append(P("<b>Thresholds</b> (M02 report section 6.4): Success on at least 80 % of attempts per task, time at or under the target shown for each task, at most 2 errors per task (T1: 0 wrong turns), "
           "mean SEQ at least 5.5, mean SUS at least 68, no open High issue. Every target is <b>unchanged from the M02 kit except T3</b> (150 s instead of 120 s, see T3).", BS))
S.append(Spacer(1, 4))

for t in D.TASKS:
    head = Table([[P(f"<b>{t['id']}</b> · {t['role']} · sign in as <b>{t['login']}</b> · start: {t['start']} · {t['req']}", HDS)]], colWidths=[PW])
    head.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY), ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5)]))
    left = [P("YOU READ ALOUD", ParagraphStyle("l", parent=SM, fontName="Helvetica-Bold", textColor=NAVY)),
            P(f"“{t['read']}”", ParagraphStyle("r", parent=B, fontName="Helvetica-Bold")),
            Spacer(1, 3),
            P(f"<b>Expected path</b> (do not tell): {t['path']}", CELL),
            Spacer(1, 3),
            P(f"<b>Watch for:</b> {t['watch']}", CELL)]
    right = [P("FACILITATOR CRITERIA", ParagraphStyle("l2", parent=SM, fontName="Helvetica-Bold", textColor=NAVY)),
             P(f"<b>Success:</b> {t['success']}", CELL), Spacer(1, 2),
             P(f"<b>Partial:</b> {t['partial']}", CELL), Spacer(1, 2),
             P(f"<b>Fail:</b> {t['fail']}", CELL), Spacer(1, 3),
             P(f"<b>Target:</b> ≤ {t['time']} s, {'0 wrong turns' if t['errors'] == 0 else '≤ 2 errors'} ({t['time_note']}).", CELL)]
    body = Table([[left, right]], colWidths=[92 * mm, PW - 92 * mm])
    body.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.4, GRID), ("LINEAFTER", (0, 0), (0, -1), 0.4, GRID), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("BACKGROUND", (1, 0), (1, -1), SOFT), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    S.append(KeepTogether([head, body, Spacer(1, 7)]))
    if t["id"] == "T6":
        S.append(box("<b>Role change:</b> if the same participant now does provider tasks, <b>reset the data</b> (A2 step 1), sign out of the customer account and sign in as nimal@gedara.lk before T7.", YEL))
        S.append(Spacer(1, 5))
    if t["id"] == "T8":
        S.append(box("<b>Role change:</b> before T9 <b>reset the data</b> again and sign in as ruwan@gedara.lk (use a laptop browser for the wide layout if you can). Write the Dashboard “Open complaints” number on the sheet before T10.", YEL))
        S.append(Spacer(1, 5))

S.append(P("After every task: the SEQ question", H3))
S.append(tbl([("<b>After every task:</b> “Overall, how difficult or easy was that task, from 1, very difficult, to 7, very easy?”", "Gives a number from 1 to 7. Write it down. Ask it after Fail and Partial too.")]))
S.append(Spacer(1, 6))

# =================================================================== E. SUS, post-test, closing
S.append(P("E. System Usability Scale (3 min)", H2))
S.append(P("Say: “Now ten short statements about the app as a whole. For each one, circle a number from 1, strongly disagree, to 5, strongly agree. Go with your first reaction.” Hand over the SUS form (next page) or read the statements aloud and circle for them. "
           "If the participant only did some roles, they rate the app they used.", BS))
S.append(P("F. Post-test questions (5 min): write their own words", H2))
q = [("“What was the easiest part, and what was the most confusing part?”", "Own answer."),
     ("“Did you feel you could trust the providers shown? What made you trust or doubt them: the rating, the Verified label, the reviews, something else?”", "Own answer."),
     ("“Who could see your phone number and your address, and when?” <i>(Listen for “after the provider accepts”.)</i>", "Own answer."),
     ("“How would you expect to pay for the job? Did the Cash or Card choice make sense?”", "Own answer."),
     ("“Customers: how did adding the photo go?  Providers: what did you think of the photo tiles?  Administrators: could you really check the documents?”", "Own answer."),
     ("“Was there a moment you wanted to ask for help, or a message that did not make sense?”", "Own answer."),
     ("<i>Providers and administrators:</i> “How does this compare with how you do it now?”", "Own answer."),
     ("“Would you use this app for a real job? Why or why not?”", "Own answer."),
     ("“What is one thing you would change first?”", "Own answer."),
     ("“That is the end of the test. Thank you very much, it really helps. I will stop the recording now.” <b>Stop the recording.</b> “Do you want to ask me anything? Do you still agree that I may use your results?”", "Says goodbye.")]
S.append(tbl(q))
S.append(PageBreak())

# =================================================================== SUS form
S.append(P("System Usability Scale – participant form", H1))
S.append(P("Participant code U____ &nbsp;&nbsp; Role(s) used: Customer / Provider / Admin &nbsp;&nbsp; Date: ________", SM))
S.append(Spacer(1, 5))
S.append(P("Please circle one number for each statement, from <b>1 = strongly disagree</b> to <b>5 = strongly agree</b>. Give your first reaction; there are no right or wrong answers. "
           "The statements are about the Gedara app.", B))
S.append(Spacer(1, 5))
sd = [[P("", HDS), P("Statement", HDS)] + [P(str(i), ParagraphStyle("c", parent=HDS, alignment=1)) for i in range(1, 6)]]
for i, s in enumerate(D.SUS_ITEMS, 1):
    sd.append([P(str(i), CELL), P(s, B)] + [P(str(n), ParagraphStyle("n", parent=CTR, fontSize=11, textColor=colors.HexColor("#8a8a85"))) for n in range(1, 6)])
st = Table(sd, colWidths=[8 * mm, 100 * mm] + [13.6 * mm] * 5, rowHeights=[8 * mm] + [13 * mm] * 10)
st.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.4, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("BACKGROUND", (0, 1), (1, -1), SOFT)]))
S.append(st)
S.append(Spacer(1, 3))
S.append(P("1 = strongly disagree &nbsp;·&nbsp; 3 = neither &nbsp;·&nbsp; 5 = strongly agree", SM))
S.append(Spacer(1, 6))
S.append(box("<b>Facilitator:</b> type the ten numbers into the SUS sheet of the workbook (row = participant code). The score is calculated there: odd statements answer minus 1, even statements 5 minus answer, add the ten and multiply by 2.5 (0 to 100). "
             "Do not score unfinished forms: leave a form with a missing answer as it is (the sheet shows no score).", SOFT))

# =================================================================== Observation sheet (landscape)
LW = 273 * mm
S.append(NextPageTemplate("land"))
S.append(PageBreak())
S.append(P("Observation sheet – one per participant", ParagraphStyle("h1l", parent=H1, fontSize=13, leading=15)))
cell = ParagraphStyle("oc", parent=CELL, fontSize=7.8, leading=9.6)
cellb = ParagraphStyle("ocb", parent=cell, fontName="Helvetica-Bold")
hrows = [
    [P("<b>Code</b> U____", cell), P("<b>Date</b> ________", cell), P("<b>Device</b> iPhone / Android / Laptop", cell), P("<b>Connection</b> Expo Go / APK / Browser", cell), P("<b>Phone</b> own / test", cell),
     P("<b>Age group</b> 18-24 25-34 35-44 45-54 55+", cell)],
    [P("<b>Consent</b> take part Y / N", cell), P("<b>Recorded</b> Y / N", cell), P("<b>File</b> U__role.mp4", cell),
     P("<b>Real background</b> customer / tradesperson / admin or office / student or friend role-playing", cell), P("<b>Roles done</b> C / P / A", cell), P("<b>Resets</b> start <font name='DejaVu'>☐</font> T7 <font name='DejaVu'>☐</font> T9 <font name='DejaVu'>☐</font>", cell)],
    [P("<b>T2:</b> Nimal “Next free” on screen: ______________", cell), P("<b>T8:</b> target weekday (today + 3 days): ________", cell), P("<b>T10:</b> Open complaints before: ____ (expect 2)", cell),
     P("<b>SUS form</b> done Y / N", cell), P("", cell), P("", cell)],
]
ht = Table(hrows, colWidths=[44 * mm, 41 * mm, 46 * mm, 50 * mm, 40 * mm, 52 * mm])
ht.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.5, GRID), ("INNERGRID", (0, 0), (-1, -1), 0.3, GRID), ("BACKGROUND", (0, 0), (-1, -1), YEL), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5)]))
S.append(ht)
S.append(Spacer(1, 3))
cols = ["Task", "Outcome\nS / P / F", "Time (s)\nif Success", "Errors (tally)", "Hints (H)", "SEQ\n1 to 7", "What they did and said (quotes, hesitations, tech faults)", "Sev.\nH / M / L"]
od = [[P(c.replace("\n", "<br/>"), ParagraphStyle("oh", parent=HD, fontSize=7.6, leading=9)) for c in cols]]
short = {"T1": "Customer", "T2": "Customer", "T3": "Customer", "T4": "Customer", "T5": "Customer", "T6": "Customer", "T7": "Provider", "T8": "Provider", "T9": "Admin", "T10": "Admin"}
for t in D.TASKS:
    od.append([P(f"<b>{t['id']}</b> {short[t['id']]}<br/>≤ {t['time']} s", cell), "", "", "", "", "", "", ""])
ot = Table(od, colWidths=[24 * mm, 20 * mm, 19 * mm, 26 * mm, 16 * mm, 14 * mm, 138 * mm, 16 * mm], rowHeights=[9 * mm] + [10.2 * mm] * 10)
ot.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.4, GRID), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("BACKGROUND", (0, 1), (0, -1), SOFT)]))
S.append(ot)
S.append(Spacer(1, 3))
bottom = Table([[P("<b>Top problems seen</b> (one line each; log in the Issues sheet)<br/><br/>1. ______________________________________________<br/><br/>2. ______________________________________________<br/><br/>3. ______________________________________________", cell),
                 P("<b>Severity</b><br/><b>High:</b> stops the task, wrong outcome (such as a double booking) or damages trust.<br/><b>Medium:</b> slows or confuses, but they recover; or a Low issue that affects half or more of the participants.<br/><b>Low:</b> cosmetic, wording or preference; no effect on finishing.<br/><b>Error</b> = a tap leading away from the goal, an error message triggered, or going back to undo. <b>Tech fault</b> is not an error.", cell)]],
               colWidths=[118 * mm, 155 * mm])
bottom.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.5, GRID), ("INNERGRID", (0, 0), (-1, -1), 0.3, GRID), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
S.append(bottom)
S.append(NextPageTemplate("port"))
S.append(PageBreak())

# =================================================================== Ethics note
S.append(P("Ethics and data note", H1))
S.append(P("Keep this with the script. It applies to every session.", SM))
eth = [
    "<b>Anonymous codes.</b> Participants are U1, U2, U3, U4, U5 (and U6 onwards if you test more). No names, phone numbers or addresses go on the observation sheets, in the workbook, in file names or in the report. Keep no name-to-code list unless your course asks for signed consent forms; if it does, store those forms apart from the data.",
    "<b>Adults only, voluntary.</b> Test only people aged 18 or over. Nobody is pressed, paid or rewarded for a particular answer. They can stop at any time and ask for their results and recording to be deleted until you submit. Friends and family may take part, but say so honestly in “Real background” on the Participants sheet, and do not coach them.",
    "<b>Consent first, recording only with consent.</b> Ask the two consent questions in section B before anything is recorded. If the answer to recording is No, take written notes only. Start the recording only after a Yes, and capture the Yes on the recording. Say aloud who will see the recording (the consent text has the two options) and keep to what you said.",
    "<b>Fake data only.</b> Everything in the app is invented and nothing is sent or paid. The address and phone are pre-filled for the demo customer. The photo chosen in T3 stays on the phone; the app records only that one photo was added. If a participant says a surname, phone number or address on the recording, cut that part out.",
    "<b>Storage and sharing.</b> Name files U1_customer.mp4, U2_provider.mp4 and so on. Keep them in the folder you will submit, shared only as described to the participant. Do not post clips publicly or use them for anything else.",
    "<b>Honest results.</b> You built the app, so you are biased. Do not defend it, explain it or hint during tasks. Record failures, hints and tech faults as they happen, report every participant who took part (including bad results) and never invent, copy or adjust a participant, a time or a rating. A task that was not attempted is left blank, not guessed. If fewer than 5 consenting participants take part, say so in the report.",
    "<b>Privacy of the app itself.</b> Participants may notice that phone numbers are hidden until a provider accepts (“Shown after acceptance”). Note their comments on this: it is part of requirement NFR3.",
]
S.append(checklist(eth))
S.append(Spacer(1, 6))
S.append(P("After every session", H2))
S.append(checklist([
    "Save the recording as <b>U__role.mp4</b> (for example U3_customer.mp4), only if the participant said Yes to recording. No names in file names.",
    "Sign the device out. Reset the data before the next participant.",
    "Within the same day: type the observation sheet and SUS form into the workbook (Participants, Task log, SUS, Issues). Only real data: leave unattempted tasks blank. Then keep or shred the paper sheets as your course requires.",
    "Log each problem in the Issues sheet with a severity from the table on the observation sheet.",
]))

# =================================================================== document


def foot(c, d):
    w, h = c._pagesize
    c.saveState(); c.setFont("Helvetica", 7.5); c.setFillColor(colors.HexColor("#898781"))
    c.drawString(17 * mm if w < h else 12 * mm, 9 * mm, "Gedara usability test script · IT3060 Milestone 03")
    c.drawRightString(w - (17 * mm if w < h else 12 * mm), 9 * mm, f"Page {d.page}")
    c.restoreState()


doc = BaseDocTemplate(OUT, pagesize=A4, title="Gedara app usability test session script (IT3060 Milestone 03)", author="IT22923042")
pw, ph = A4
doc.addPageTemplates([
    PageTemplate(id="port", frames=[Frame(17 * mm, 16 * mm, pw - 34 * mm, ph - 31 * mm, id="p", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=foot, pagesize=A4),
    PageTemplate(id="land", frames=[Frame(12 * mm, 14 * mm, ph - 24 * mm, pw - 24 * mm, id="l", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=foot, pagesize=landscape(A4)),
])
doc.build(S)
print("saved", OUT)
