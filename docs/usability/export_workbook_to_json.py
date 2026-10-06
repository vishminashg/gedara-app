"""Reads the FILLED usability workbook and writes usability3.json in the shape of usability3.template.json.

Run:  python3 export_workbook_to_json.py IT3060_Milestone03_Usability_Workbook.xlsx usability3.json
Only cells that were really filled in are exported: blank task rows, blank participants and unfinished SUS forms are skipped.
Nothing is invented or defaulted.
"""
import json, re, sys
from openpyxl import load_workbook

src = sys.argv[1] if len(sys.argv) > 1 else "IT3060_Milestone03_Usability_Workbook.xlsx"
dst = sys.argv[2] if len(sys.argv) > 2 else "usability3.json"
wb = load_workbook(src)  # formulas are not needed: only the typed-in cells are read


def v(cell):
    x = cell.value
    if x is None or (isinstance(x, str) and x.strip() == ""):
        return None
    if hasattr(x, "isoformat"):
        return x.date().isoformat() if hasattr(x, "date") else x.isoformat()
    return x.strip() if isinstance(x, str) else x


CODE = re.compile(r"^U\d+$")


def num(x):
    return None if x is None else (int(x) if float(x) == int(x) else float(x))


out = {"participants": [], "tasks": [], "sus": [], "issues": []}

wp = wb["Participants"]
for r in range(2, wp.max_row + 1):
    code = v(wp.cell(row=r, column=1))
    vals = [v(wp.cell(row=r, column=c)) for c in range(2, 11)]
    if not code or not CODE.match(code) or all(x is None for x in vals):
        continue
    out["participants"].append(dict(code=code, background=vals[0], roles_tested=vals[1], age_group=vals[2], device=vals[3],
                                    connection=vals[4], session_date=vals[5], consent=vals[6], recorded=vals[7], recording_file=vals[8]))

wt = wb["Task log"]
by_task = {}
for r in range(2, wt.max_row + 1):
    p, t, o = (v(wt.cell(row=r, column=c)) for c in (1, 2, 3))
    if not (p and t and o):
        continue
    by_task.setdefault(t, []).append(dict(participant=p, success=o, time_s=num(v(wt.cell(row=r, column=4))), errors=num(v(wt.cell(row=r, column=5))),
                                          seq=num(v(wt.cell(row=r, column=7))), hints=num(v(wt.cell(row=r, column=6))), note=v(wt.cell(row=r, column=8))))
ws = wb["Summary"]
for r in range(2, 12):
    tid, role = v(ws.cell(row=r, column=1)), v(ws.cell(row=r, column=2))
    out["tasks"].append(dict(id=tid, role=role, results=by_task.get(tid, [])))

su = wb["SUS"]
for r in range(2, su.max_row + 1):
    code = v(su.cell(row=r, column=1))
    if not (code and CODE.match(code)):
        continue
    items = [num(v(su.cell(row=r, column=c))) for c in range(2, 12)]
    if all(i is not None for i in items):
        out["sus"].append(dict(participant=code, items=items))

wi, wf = wb["Issues"], wb["Fix log"]
for r in range(2, wi.max_row + 1):
    iid, text = v(wi.cell(row=r, column=1)), v(wi.cell(row=r, column=4))
    if not (iid and text):
        continue
    out["issues"].append(dict(id=iid, interface=v(wi.cell(row=r, column=3)), issue=text, severity=v(wi.cell(row=r, column=5)),
                              fix=v(wf.cell(row=r, column=4)), status=v(wi.cell(row=r, column=9)), task=v(wi.cell(row=r, column=2)),
                              participants_affected=num(v(wi.cell(row=r, column=6))), participant_codes=v(wi.cell(row=r, column=7)),
                              requirement=v(wi.cell(row=r, column=8)), found_in=v(wi.cell(row=r, column=10)), retest_result=v(wf.cell(row=r, column=6))))

with open(dst, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f"wrote {dst}: {len(out['participants'])} participants, {sum(len(t['results']) for t in out['tasks'])} task results, {len(out['sus'])} SUS forms, {len(out['issues'])} issues")
