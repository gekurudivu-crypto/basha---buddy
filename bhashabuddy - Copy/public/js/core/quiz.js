// Daily quiz generation. Pure and seedable, so the same day gives the same quiz and tests are deterministic.

export const QUIZ_LENGTH = 5;
export const QUESTION_TYPES = ["word", "def", "fill", "word", "def"];

/** Small seeded PRNG (mulberry32). */
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const seedFromDate = (day) => [...day].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);

/** Replace the target word in its example sentence with a blank. */
export const blankOut = (word) => word.ex.replace(new RegExp(word.en, "i"), "_____");

/**
 * Build a quiz: 5 questions, wrong answers come from the same unit as the right one.
 * @returns {{qs:{wordId:number,type:string,options:number[],answer:number}[], i:number, picked:number|null, score:number, done:boolean}}
 */
export function buildQuiz(words, seed) {
  if (!Array.isArray(words) || words.length < 4) throw new Error("Need at least 4 words to build a quiz");
  const r = rng(seed);
  const picks = shuffle(words, r).slice(0, QUIZ_LENGTH);
  const qs = picks.map((w, i) => {
    const sameUnit = words.filter((x) => x.id !== w.id && x.unit === w.unit);
    const pool = sameUnit.length >= 3 ? sameUnit : words.filter((x) => x.id !== w.id);
    const wrong = shuffle(pool, r).slice(0, 3);
    return {
      wordId: w.id,
      type: QUESTION_TYPES[i % QUESTION_TYPES.length],
      options: shuffle([w, ...wrong], r).map((o) => o.id),
      answer: w.id,
    };
  });
  return { qs, i: 0, picked: null, score: 0, done: false };
}
