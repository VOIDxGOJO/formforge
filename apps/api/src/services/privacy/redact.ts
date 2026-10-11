// PII redactor (report Section 4.1.20). Ported 1:1 from report_work/experiments/quality_eval.py;
// test/redact.test.ts reproduces the Section 7.8 numbers on the same 30 sentences.

export type PiiType = 'EMAIL' | 'URL' | 'IP' | 'AADHAAR' | 'PAN' | 'PHONE' | 'REGNO' | 'PERSON';
export type PiiMatch = { type: PiiType; value: string };

// Order matters: an earlier, more specific pattern wins over a later overlapping one.
const PATTERNS: Array<[PiiType, RegExp]> = [
  ['EMAIL', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ['URL', /\bhttps?:\/\/[^\s,]+|\bwww\.[^\s,]+/g],
  ['IP', /\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
  ['AADHAAR', /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g],
  ['PAN', /\b[A-Z]{5}\d{4}[A-Z]\b/g],
  ['PHONE', /(?:\+91[\s-]?|\b0)?\b[6-9]\d{4}[\s-]?\d{5}\b/g],
  ['REGNO', /\b\d{2}[A-Z]{3}\d{4}\b/g],
  // Names only after a cue phrase; the name itself is capture group 1, at the end of the match.
  [
    'PERSON',
    /(?:(?:[Mm]y name is|I am|I'm|[Mm]entor|[Mm]anager|[Gg]uide|[Ss]ir|[Mm]a'am|Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.)\s+)((?:[A-Z][a-z]+)(?:\s[A-Z][a-z]+)?)/g
  ]
];

/** Replaces personal details with typed tags such as [EMAIL] or [PERSON]. */
export function redact(text: string): { text: string; found: PiiMatch[] } {
  const hits: Array<{ start: number; end: number; type: PiiType }> = [];
  for (const [type, pattern] of PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const end = m.index + m[0].length;
      const start = type === 'PERSON' ? end - m[1]!.length : m.index;
      if (hits.some((h) => !(end <= h.start || start >= h.end))) continue;
      hits.push({ start, end, type });
    }
  }
  const found = hits.map((h) => ({ type: h.type, value: text.slice(h.start, h.end) }));
  let out = text;
  for (const h of [...hits].sort((a, b) => b.start - a.start)) {
    out = `${out.slice(0, h.start)}[${h.type}]${out.slice(h.end)}`;
  }
  return { text: out, found };
}
