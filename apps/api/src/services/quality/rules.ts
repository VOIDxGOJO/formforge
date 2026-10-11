// Rule layer of the Form Quality Analyzer. Ported one-to-one from
// report_work/experiments/quality_eval.py so the app reproduces the
// precision/recall reported in Table 7.9 (checked by test/quality-rules.test.ts).

const LEADING_ADJ =
  '(excellent|amazing|great|wonderful|outstanding|fantastic|awesome|terrible|awful|horrible|poor|helpful|friendly|innovative|world-class|best)';

const LEADING_PATTERNS = [
  /\b(don't|do not|wouldn't|would not|isn't|is not|aren't|shouldn't|can't) you (agree|think|feel|say)/,
  /\bhow much did you (enjoy|love|like|appreciate)\b/,
  /\bhow (great|good|helpful|amazing|excellent|useful) (was|were|is|are)\b/,
  new RegExp(`\\bour ${LEADING_ADJ}\\b`),
  new RegExp(`\\b(the|this|that) ${LEADING_ADJ} (service|team|course|product|mentor|event|session|staff|support)`),
  /\b(most|many) (people|students|users|employees) (agree|say|feel|think)\b/,
  /\bobviously\b|\bclearly\b|\bof course\b/,
  /\bagree that\b/
];

const VAGUE =
  /\b(good|bad|nice|fine|okay|ok|regularly|often|frequently|sometimes|recently|usually|enough|properly|adequate|decent|normal|a lot|much|fair|reasonable|soon|several|many|few)\b/;
const ANCHORS =
  /\b(per week|per day|per month|in the last|in the past|days|weeks|months|hours|times|scale of|1 to|1-5|1–5|out of|compared to|than)\b/;
const SAFE_AND =
  /\b(pros and cons|terms and conditions|research and development|black and white|rock and roll|salt and pepper|b\.?tech and m\.?tech|q&a|questions and answers|name and surname|first and last name|date and time|city and state|state and country|day and month)\b/g;
const JOINED = /\b([a-z][a-z-]{2,})( and | as well as | & |\/)([a-z][a-z-]{2,})\b/;
const JOIN_STOP = new Set(['you', 'your', 'the', 'how', 'what', 'are', 'was', 'were', 'did', 'does', 'will', 'and', 'any', 'all']);

/** Two evaluation objects joined by and/or ("mentor and project"), or more than one question mark. */
export const isDoubleBarrelled = (label: string): boolean => {
  const text = label.toLowerCase();
  const m = JOINED.exec(text.replace(SAFE_AND, 'X'));
  if (m && !JOIN_STOP.has(m[1]!) && !JOIN_STOP.has(m[3]!)) return true;
  return (text.match(/\?/g) ?? []).length > 1;
};

/** Wording that suggests the expected answer. */
export const isLeading = (label: string): boolean => {
  const text = label.toLowerCase();
  return LEADING_PATTERNS.some((p) => p.test(text));
};

/** Vague quantifier or judgement word with no time window, scale or unit to anchor it. */
export const isAmbiguous = (label: string): boolean => {
  const text = label.toLowerCase();
  return VAGUE.test(text) && !ANCHORS.test(text);
};

// --------------------------------------------------------------- redundancy
const STOP = new Set(
  'a an the of to in on for with was were is are did do does you your how what which would could please rate by at from this that it and or be been any'.split(
    ' '
  )
);
const SYN: Record<string, string> = {
  happy: 'satisfied', satisfaction: 'satisfied', satisfy: 'satisfied', helpful: 'useful', useful: 'useful',
  given: '', weekly: 'week', per: '', recommend: 'recommend', others: 'friend', simple: 'easy',
  understandable: 'clear', instructions: 'instruction', good: 'quality', served: '', fast: 'speed',
  problems: 'issue', issues: 'issue', registering: 'registration', face: '', hard: 'difficult',
  examination: 'exam', find: '', likely: '', hours: 'hour', working: 'work', feedback: 'feedback'
};

export const contentTokens = (text: string): Set<string> => {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().match(/[a-z\-']+/g) ?? []) {
    const stripped = raw.replace(/^'+|'+$/g, '');
    const w = SYN[stripped] ?? stripped;
    if (w && !STOP.has(w)) out.add(w.endsWith('s') && w.length > 4 ? w.slice(0, -1) : w);
  }
  return out;
};

/** Jaccard overlap of normalised content words, 0-1. */
export const lexicalSimilarity = (a: string, b: string): number => {
  const A = contentTokens(a);
  const B = contentTokens(b);
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / Math.max(1, A.size + B.size - shared);
};

/** Lexical layer threshold (F1 1.00 on the 24 labelled pairs at 0.4). */
export const LEXICAL_REDUNDANCY_THRESHOLD = 0.4;

// --------------------------------------------------------------- readability
const syllables = (word: string): number => {
  const groups = word.toLowerCase().match(/[aeiouy]+/g) ?? [];
  const n = groups.length - (word.toLowerCase().endsWith('e') && groups.length > 1 ? 1 : 0);
  return Math.max(1, n);
};

/** Flesch Reading Ease (Flesch, 1948). */
export const readingEase = (text: string): number => {
  const words = text.match(/[A-Za-z']+/g) ?? [];
  if (words.length === 0) return 100;
  const sentences = Math.max(1, (text.match(/[.?!]/g) ?? []).length);
  const syl = words.reduce((sum, w) => sum + syllables(w), 0);
  return 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syl / words.length);
};

export const wordCount = (text: string): number => (text.match(/[A-Za-z']+/g) ?? []).length;
