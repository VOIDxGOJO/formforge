"""
Evaluation of the rule layer of the FormForge Form Quality Analyzer and of the
PII redaction layer, on small hand-labelled test sets.
Run: python quality_eval.py   -> results/quality.json, results/pii.json
"""
import json, os, re, math
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------------ analyzer
LEADING_ADJ = r"(excellent|amazing|great|wonderful|outstanding|fantastic|awesome|terrible|awful|horrible|poor|helpful|friendly|innovative|world-class|best)"
LEADING_PATTERNS = [
    r"\b(don't|do not|wouldn't|would not|isn't|is not|aren't|shouldn't|can't) you (agree|think|feel|say)",
    r"\bhow much did you (enjoy|love|like|appreciate)\b",
    r"\bhow (great|good|helpful|amazing|excellent|useful) (was|were|is|are)\b",
    r"\bour " + LEADING_ADJ + r"\b",
    r"\b(the|this|that) " + LEADING_ADJ + r" (service|team|course|product|mentor|event|session|staff|support)",
    r"\b(most|many) (people|students|users|employees) (agree|say|feel|think)\b",
    r"\bobviously\b|\bclearly\b|\bof course\b",
    r"\bagree that\b",
]
VAGUE = r"\b(good|bad|nice|fine|okay|ok|regularly|often|frequently|sometimes|recently|usually|enough|properly|adequate|decent|normal|a lot|much|fair|reasonable|soon|several|many|few)\b"
ANCHORS = r"\b(per week|per day|per month|in the last|in the past|days|weeks|months|hours|times|scale of|1 to|1-5|1–5|out of|compared to|than)\b"
SAFE_AND = r"\b(pros and cons|terms and conditions|research and development|black and white|rock and roll|salt and pepper|b\.?tech and m\.?tech|q&a|questions and answers|name and surname|first and last name|date and time|city and state|state and country|day and month)\b"
CONTENT_NOUN = r"[a-z][a-z\-]{2,}"


def is_double_barrelled(q):
    t = q.lower()
    t2 = re.sub(SAFE_AND, "X", t)
    # two evaluation objects joined by and/or, e.g. "mentor and project", "fast and accurate"
    if re.search(r"\b(" + CONTENT_NOUN + r")( and | as well as | & |/)(" + CONTENT_NOUN + r")\b", t2):
        m = re.search(r"\b(" + CONTENT_NOUN + r")( and | as well as | & |/)(" + CONTENT_NOUN + r")\b", t2)
        a, b = m.group(1), m.group(3)
        stop = {"you", "your", "the", "how", "what", "are", "was", "were", "did", "does", "will", "and", "any", "all"}
        if a not in stop and b not in stop:
            return True
    if t.count("?") > 1:
        return True
    return False


def is_leading(q):
    t = q.lower()
    return any(re.search(p, t) for p in LEADING_PATTERNS)


def is_ambiguous(q):
    t = q.lower()
    return bool(re.search(VAGUE, t)) and not re.search(ANCHORS, t)


def analyze(q):
    issues = set()
    if is_double_barrelled(q): issues.add("double_barrelled")
    if is_leading(q): issues.add("leading")
    if is_ambiguous(q): issues.add("ambiguous")
    return issues


# ------------------------------------------------------- labelled question set
# Labels written by hand before running the analyzer. D = double-barrelled,
# L = leading, A = ambiguous (vague wording / no reference frame).
LABELLED = """
How satisfied were you with your mentor and your project?|D
How would you rate the speed and accuracy of the support team?|D
Was the course content relevant and up to date?|D
Do you find the app easy to use and visually appealing?|D
How clear were the instructions and the deadlines?|D
Rate the food and the cleanliness of the hostel mess.|D
Did your manager give you feedback and recognition?|D
How satisfied are you with your salary and benefits?|D
Was the workshop informative and well organised?|D
How do you rate the library's timings and book collection?|D
Should the college improve Wi-Fi and extend lab hours?|D
Were the trainers knowledgeable and approachable?|D
How much did you enjoy our excellent service?|L
Don't you agree that the new timetable is better?|L
How helpful was our friendly support staff?|L
Most students say the placement cell is very active. Do you agree?|L
How great was the guest lecture?|L
Wouldn't you say the canteen prices are fair?|LA
How amazing was the hackathon experience?|L
Do you agree that remote work improves productivity?|L
How much did you love the new dashboard?|L
Obviously the lab equipment is outdated; how often does it fail?|LA
Was the internship experience good?|A
Do you exercise regularly?|A
How often do you use the library?|A
Did you get enough support during the project?|A
Was the hostel food okay?|A
Do you attend classes properly?|A
How much time do you spend on social media?|A
Have you visited the career fair recently?|A
Is the fee structure reasonable?|A
Was the event fine overall?|A
Do you sleep enough?|A
Do you often feel stressed before exams?|A
Was the response time of the website decent?|A
How many hours per week did you work on the project?|
What is your current year of study?|
Which programming language did you use most in the last 6 months?|
On a scale of 1 to 5, how satisfied were you with the internship?|
How many times did you meet your mentor in the last 30 days?|
What is your department?|
Please enter your registered email address.|
What was the duration of your internship in weeks?|
Which city did you intern in?|
How likely are you to recommend this course to a friend, on a scale of 0 to 10?|
In the past 7 days, how many hours did you sleep per night on average?|
What is the name of your project guide?|
Which of the following tools did you use? Select all that apply.|
How would you rate the clarity of the assignment instructions?|
How would you rate the usefulness of the mentor's feedback?|
How many lab sessions did you attend this semester?|
What was your CGPA in the previous semester?|
Did you receive a pre-placement offer?|
Which work mode did you follow: remote, hybrid or on-site?|
What is the main reason you chose this elective?|
How satisfied are you with the speed of the campus Wi-Fi?|
How many days did it take to get your certificate issued?|
Which topic from the course was most useful to you?|
What should be improved in the next version of the workshop?|
How would you rate the difficulty of the final exam?|
Rate the comfort of the classroom seating.|
How long did it take to complete the registration form, in minutes?|
Did the mentor attend the weekly review meetings?|
How many members were in your project team?|
What is your preferred contact time?|
How would you rate the punctuality of the shuttle bus?|
Which payment method did you use for the fee?|
How useful was the orientation session for understanding the curriculum?|
How easy was it to find the exam schedule on the portal?|
What is one thing you would change about the hostel?|
""".strip().splitlines()

# pairs of questions; 1 = measure the same thing (redundant), 0 = different
PAIRS = """
How satisfied were you with the internship?|How happy were you with the internship?|1
How satisfied were you with the internship?|How would you rate your satisfaction with the internship?|1
How useful was your mentor's feedback?|How helpful was the feedback given by your mentor?|1
How many hours did you work per week?|What were your weekly working hours?|1
Would you recommend this course to a friend?|How likely are you to recommend this course to others?|1
How easy was the portal to use?|How simple was it to use the portal?|1
How clear were the assignment instructions?|How understandable were the instructions for the assignment?|1
Rate the quality of the hostel food.|How good was the food served in the hostel?|1
How satisfied are you with the campus Wi-Fi speed?|How fast is the Wi-Fi on campus?|1
Did you face any problems during registration?|Were there any issues while registering?|1
How difficult was the final exam?|How hard did you find the final examination?|1
How satisfied were you with the internship?|How many hours did you work per week?|0
How useful was your mentor's feedback?|Which city did you intern in?|0
What is your department?|How many members were in your project team?|0
How clear were the assignment instructions?|How difficult was the final exam?|0
Rate the quality of the hostel food.|How satisfied are you with the campus Wi-Fi speed?|0
How easy was the portal to use?|Did you receive a pre-placement offer?|0
Would you recommend this course to a friend?|What was your CGPA in the previous semester?|0
How often did you meet your mentor?|How useful was your mentor's feedback?|0
How many hours did you work per week?|How manageable was your workload?|0
How satisfied were you with the stipend?|How satisfied were you with the internship?|0
What is your preferred contact time?|Please enter your registered email address.|0
How punctual was the shuttle bus?|How comfortable was the classroom seating?|0
Which programming language did you use most?|Which tools did you use in the project?|0
""".strip().splitlines()

STOP = set("a an the of to in on for with was were is are did do does you your how what which would could please rate by at from this that it and or be been any".split())
SYN = {"happy": "satisfied", "satisfaction": "satisfied", "satisfy": "satisfied", "helpful": "useful", "useful": "useful",
       "given": "", "weekly": "week", "per": "", "recommend": "recommend", "others": "friend", "simple": "easy",
       "understandable": "clear", "instructions": "instruction", "good": "quality", "served": "", "fast": "speed",
       "problems": "issue", "issues": "issue", "registering": "registration", "face": "", "hard": "difficult",
       "examination": "exam", "find": "", "likely": "", "hours": "hour", "working": "work", "feedback": "feedback"}


def tokens(s):
    out = set()
    for w in re.findall(r"[a-z\-']+", s.lower()):
        w = w.strip("'")
        w = SYN.get(w, w)
        if w and w not in STOP:
            out.add(w[:-1] if w.endswith("s") and len(w) > 4 else w)
    return out


def similarity(a, b):
    A, B = tokens(a), tokens(b)
    return len(A & B) / max(1, len(A | B))


# ------------------------------------------------------------------- readability
def syllables(w):
    w = w.lower()
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups) - (1 if w.endswith("e") and len(groups) > 1 else 0)
    return max(1, n)


def flesch(text):
    words = re.findall(r"[A-Za-z']+", text)
    sents = max(1, len(re.findall(r"[.?!]", text)))
    if not words: return 100.0
    return 206.835 - 1.015 * (len(words) / sents) - 84.6 * (sum(syllables(w) for w in words) / len(words))


SECONDS = {"TEXT": 15, "EMAIL": 10, "NUMBER": 8, "TEXTAREA": 45, "DROPDOWN": 8, "FILE": 30, "RATING": 7}


def estimate_seconds(field_type, label, n_options=0):
    read = len(label.split()) / 3.5            # ~210 words per minute reading speed
    opt = 0.6 * n_options
    return round(SECONDS.get(field_type, 10) + read + opt, 1)


def prf(tp, fp, fn):
    p = tp / (tp + fp) if tp + fp else 0
    r = tp / (tp + fn) if tp + fn else 0
    f = 2 * p * r / (p + r) if p + r else 0
    return dict(precision=round(p, 3), recall=round(r, 3), f1=round(f, 3), tp=tp, fp=fp, fn=fn)


def eval_quality():
    code = {"D": "double_barrelled", "L": "leading", "A": "ambiguous"}
    rows = []
    for line in LABELLED:
        q, lab = line.rsplit("|", 1)
        rows.append((q, {code[c] for c in lab}, analyze(q)))
    res = {}
    for cat in code.values():
        tp = sum(1 for _, g, p in rows if cat in g and cat in p)
        fp = sum(1 for _, g, p in rows if cat not in g and cat in p)
        fn = sum(1 for _, g, p in rows if cat in g and cat not in p)
        res[cat] = prf(tp, fp, fn) | dict(support=sum(1 for _, g, _ in rows if cat in g))
    # any-issue detection (flagged vs clean)
    tp = sum(1 for _, g, p in rows if g and p); fp = sum(1 for _, g, p in rows if not g and p)
    fn = sum(1 for _, g, p in rows if g and not p); tn = sum(1 for _, g, p in rows if not g and not p)
    res["any_issue"] = prf(tp, fp, fn) | dict(tn=tn, accuracy=round((tp + tn) / len(rows), 3))
    res["n_questions"] = len(rows)
    res["n_clean"] = sum(1 for _, g, _ in rows if not g)
    res["errors"] = [dict(q=q, gold=sorted(g), pred=sorted(p)) for q, g, p in rows if g != p]
    # redundancy pairs at several thresholds
    pairs = [(a, b, int(l)) for a, b, l in (x.split("|") for x in PAIRS)]
    red = {}
    for thr in (0.3, 0.4, 0.5, 0.6):
        tp = sum(1 for a, b, l in pairs if l and similarity(a, b) >= thr)
        fp = sum(1 for a, b, l in pairs if not l and similarity(a, b) >= thr)
        fn = sum(1 for a, b, l in pairs if l and similarity(a, b) < thr)
        red[str(thr)] = prf(tp, fp, fn)
    res["redundancy_pairs"] = red
    res["n_pairs"] = len(pairs)
    # readability + time on the demo form
    demo = [("DROPDOWN", "Which department did you intern in?", 4), ("DROPDOWN", "How long was your internship?", 4),
            ("RATING", "Overall, how satisfied were you with the internship?", 5), ("DROPDOWN", "How often did you meet your mentor?", 4),
            ("RATING", "How useful was the feedback from your mentor?", 5), ("RATING", "How well did your tasks match your skills?", 5),
            ("RATING", "How would you rate your satisfaction with the internship?", 5), ("DROPDOWN", "How many hours did you work in a typical week?", 4),
            ("RATING", "How manageable was your workload?", 5), ("RATING", "How much did you improve technically?", 5),
            ("RATING", "How adequate were the tools and systems you were given?", 5), ("RATING", "How clear was communication inside your team?", 5),
            ("DROPDOWN", "Would you recommend this internship to a junior?", 3), ("DROPDOWN", "Would you accept a pre-placement offer from this company?", 3),
            ("DROPDOWN", "What was your work mode?", 3), ("RATING", "How fair was the stipend for the work done?", 5),
            ("TEXTAREA", "What should the company improve for the next batch of interns?", 0)]
    res["demo_form"] = [dict(type=t, label=l, seconds=estimate_seconds(t, l, k), flesch=round(flesch(l), 1), issues=sorted(analyze(l))) for t, l, k in demo]
    res["demo_total_seconds"] = round(sum(d["seconds"] for d in res["demo_form"]), 1)
    json.dump(res, open(os.path.join(OUT, "quality.json"), "w"), indent=2)
    return res


# ------------------------------------------------------------------------ PII
PII_PATTERNS = [
    ("EMAIL", r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    ("URL", r"\bhttps?://[^\s,]+|\bwww\.[^\s,]+"),
    ("IP", r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    ("AADHAAR", r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b"),
    ("PAN", r"\b[A-Z]{5}\d{4}[A-Z]\b"),
    ("PHONE", r"(?:\+91[\s-]?|\b0)?\b[6-9]\d{4}[\s-]?\d{5}\b"),
    ("REGNO", r"\b\d{2}[A-Z]{3}\d{4}\b"),
    ("PERSON", r"(?:(?:[Mm]y name is|I am|I'm|[Mm]entor|[Mm]anager|[Gg]uide|[Ss]ir|[Mm]a'am|Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.)\s+)((?:[A-Z][a-z]+)(?:\s[A-Z][a-z]+)?)"),
]


def redact(text):
    found = []
    spans = []
    for label, pat in PII_PATTERNS:
        for m in re.finditer(pat, text):
            s, e = (m.span(1) if label == "PERSON" else m.span())
            if any(not (e <= a or s >= b) for a, b in spans):
                continue
            spans.append((s, e)); found.append((label, text[s:e]))
    out = text
    for (s, e), (label, _) in sorted(zip(spans, found), key=lambda z: -z[0][0]):
        out = out[:s] + f"[{label}]" + out[e:]
    return out, found


PII_SET = [
    ("My mentor Ravi Kumar was very supportive.", [("PERSON", "Ravi Kumar")]),
    ("Contact me at priya.sharma@gmail.com for details.", [("EMAIL", "priya.sharma@gmail.com")]),
    ("Call 9876543210 if the form breaks.", [("PHONE", "9876543210")]),
    ("My number is +91 98450 12345.", [("PHONE", "+91 98450 12345")]),
    ("The repo is at https://github.com/demo/project", [("URL", "https://github.com/demo/project")]),
    ("Server IP was 192.168.1.20 during testing.", [("IP", "192.168.1.20")]),
    ("Aadhaar 1234 5678 9012 was asked at joining.", [("AADHAAR", "1234 5678 9012")]),
    ("PAN ABCDE1234F submitted to HR.", [("PAN", "ABCDE1234F")]),
    ("I am Ananya Iyer from the IT department.", [("PERSON", "Ananya Iyer")]),
    ("Dr. Meena helped me with the report.", [("PERSON", "Meena")]),
    ("Workload was too high in the last two weeks.", []),
    ("The canteen closes at 9 pm, which is too early.", []),
    ("Version 2.4.1 of the app crashed twice.", []),
    ("Need more sessions on cloud computing.", []),
    ("My register number is 23MCA1045.", [("REGNO", "23MCA1045")]),
    ("Email hr@company.co.in or call 080-41234567.", [("EMAIL", "hr@company.co.in"), ("PHONE", "080-41234567")]),
    ("Prof. Suresh Babu takes the cloud lab.", [("PERSON", "Suresh Babu")]),
    ("Manager Kavya never replied to my mails.", [("PERSON", "Kavya")]),
    ("Room 204 projector does not work.", []),
    ("Shared the doc on www.notion.so/team-page yesterday.", [("URL", "www.notion.so/team-page")]),
    ("The stipend of 15000 per month was paid late.", []),
    ("I worked with Rahul on the backend.", [("PERSON", "Rahul")]),
    ("Reach me on 7012345678 or at a.k@vit.ac.in", [("PHONE", "7012345678"), ("EMAIL", "a.k@vit.ac.in")]),
    ("Batch 2024 had 120 interns.", []),
    ("The guide Mr. Arjun Rao was strict but fair.", [("PERSON", "Arjun Rao")]),
    ("We deployed on 10.0.0.5 inside the VPN.", [("IP", "10.0.0.5")]),
    ("Score was 8.5 out of 10.", []),
    ("My name is Fatima Khan and I was in the data team.", [("PERSON", "Fatima Khan")]),
    ("Ticket 4521 was raised for the laptop issue.", []),
    ("Call me later at 98765 43210 please.", [("PHONE", "98765 43210")]),
]


def eval_pii():
    per = {}
    tp = fp = fn = 0
    for text, gold in PII_SET:
        _, found = redact(text)
        g = set(gold); f = set(found)
        for lab, _ in g | f:
            per.setdefault(lab, [0, 0, 0])
        for x in f & g: per[x[0]][0] += 1
        for x in f - g: per[x[0]][1] += 1
        for x in g - f: per[x[0]][2] += 1
        tp += len(f & g); fp += len(f - g); fn += len(g - f)
    res = dict(overall=prf(tp, fp, fn), per_type={k: prf(*v) for k, v in per.items()},
               n_sentences=len(PII_SET), n_entities=sum(len(g) for _, g in PII_SET),
               examples=[dict(input=t, output=redact(t)[0]) for t, _ in PII_SET[:8]])
    json.dump(res, open(os.path.join(OUT, "pii.json"), "w"), indent=2)
    return res


if __name__ == "__main__":
    q = eval_quality()
    for k in ("double_barrelled", "leading", "ambiguous", "any_issue"):
        print(k, q[k])
    print("redundancy", q["redundancy_pairs"])
    print("demo total seconds", q["demo_total_seconds"])
    for e in q["errors"]: print("  ERR", e)
    p = eval_pii()
    print("PII", p["overall"]); print(p["per_type"])
