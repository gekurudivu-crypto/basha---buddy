// Pronunciation scoring. Pure functions, no DOM: used by the browser AND the Node server (and the tests).

export const PASS_SCORE = 70;
export const MAX_EDITS_FORGIVEN = 2; // brief: Levenshtein distance <= 2 still counts as a good attempt

/** Classic two-row Levenshtein edit distance. */
export function levenshtein(a, b) {
  a = String(a); b = String(b);
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Lower-case, keep only a-z and spaces. */
export function normalize(s) {
  return String(s ?? "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Score what the microphone heard against the target word.
 * @param {string} target       the English word, e.g. "Algorithm"
 * @param {string[]} heardList  recogniser alternatives (best first)
 * @param {number} confidence   0..1 recogniser confidence (only used for exact matches)
 * @returns {{score:number, heard:string, distance:number, passed:boolean}}
 */
export function gradePronunciation(target, heardList, confidence = 0.9) {
  const tg = normalize(target);
  if (!tg) throw new TypeError("target word is required");
  const list = (Array.isArray(heardList) ? heardList : [heardList]).filter((x) => typeof x === "string");
  const conf = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.9;

  let best = { score: 0, heard: "", distance: tg.length };
  for (const raw of list) {
    const hh = normalize(raw);
    if (!hh) continue;
    const d = levenshtein(tg, hh);
    let s;
    if (d === 0) s = Math.round(92 + 8 * conf);
    else if (d <= MAX_EDITS_FORGIVEN) s = Math.round(86 - (d - 1) * 8);
    else s = Math.max(10, Math.min(70, Math.round((1 - d / Math.max(tg.length, hh.length)) * 100)));
    if (s > best.score) best = { score: s, heard: hh, distance: d };
  }
  return { ...best, passed: best.score >= PASS_SCORE };
}
