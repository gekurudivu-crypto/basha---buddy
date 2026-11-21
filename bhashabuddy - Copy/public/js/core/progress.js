// Progress rules (daily goal, streak, mastery) as pure functions over a plain profile object.
// profile = { lang, goal, mastered:number[], days:{ "YYYY-MM-DD": number[] }, scores:{ [id]:number }, quizzes:[{date,score,total}] }
import { addDays } from "../shared/dates.js";

export const MIN_GOAL = 1;
export const MAX_GOAL = 20;

export const emptyProfile = () => ({ lang: "en", goal: 5, mastered: [], days: {}, scores: {}, quizzes: [] });

export const clampGoal = (n) => Math.max(MIN_GOAL, Math.min(MAX_GOAL, Math.trunc(Number(n)) || 5));

export const doneOn = (profile, day) => profile.days[day] || [];

/** Consecutive days with at least one word. Today may still be empty without breaking yesterday's streak. */
export function streak(profile, today) {
  let n = 0;
  let d = today;
  if (!doneOn(profile, d).length) d = addDays(d, -1);
  while (doneOn(profile, d).length) { n++; d = addDays(d, -1); }
  return n;
}

/**
 * Credit a word as practised today. Returns { profile (new), goalJustReached }.
 * Never mutates the input.
 */
export function creditWord(profile, wordId, today) {
  const todayList = doneOn(profile, today);
  const before = todayList.length;
  const next = {
    ...profile,
    mastered: profile.mastered.includes(wordId) ? profile.mastered : [...profile.mastered, wordId],
    days: { ...profile.days, [today]: todayList.includes(wordId) ? todayList : [...todayList, wordId] },
  };
  const goalJustReached = before < profile.goal && next.days[today].length >= profile.goal;
  return { profile: next, goalJustReached };
}

export const bestScore = (profile, wordId, score) => ({
  ...profile, scores: { ...profile.scores, [wordId]: Math.max(profile.scores[wordId] || 0, score) },
});

export const masteredInUnit = (profile, words, unitId) =>
  words.filter((w) => w.unit === unitId && profile.mastered.includes(w.id)).length;
