import test from "node:test";
import assert from "node:assert/strict";
import { emptyProfile, creditWord, streak, bestScore, clampGoal, masteredInUnit } from "../public/js/core/progress.js";
import { addDays, isDateKey, dkey } from "../public/js/shared/dates.js";

test("dates: addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29");
});

test("dates: isDateKey", () => {
  assert.ok(isDateKey("2026-11-20"));
  for (const bad of ["2026-13-01", "20-11-2026", "2026-1-1", "", null, 5, "2026-11-20x"]) assert.ok(!isDateKey(bad), String(bad));
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(dkey()));
});

test("creditWord marks mastered once and logs the day", () => {
  let p = emptyProfile();
  ({ profile: p } = creditWord(p, 4, "2026-11-20"));
  ({ profile: p } = creditWord(p, 4, "2026-11-20"));
  assert.deepEqual(p.mastered, [4]);
  assert.deepEqual(p.days["2026-11-20"], [4]);
});

test("creditWord does not mutate its input", () => {
  const p = emptyProfile();
  const snap = JSON.stringify(p);
  creditWord(p, 1, "2026-11-20");
  assert.equal(JSON.stringify(p), snap);
});

test("goalJustReached is true exactly once, when the 5th word lands", () => {
  let p = emptyProfile();
  const flags = [];
  for (const id of [0, 1, 2, 3, 4, 4, 5]) { const r = creditWord(p, id, "2026-11-20"); p = r.profile; flags.push(r.goalJustReached); }
  assert.deepEqual(flags, [false, false, false, false, true, false, false]);
});

test("streak counts consecutive days and survives an empty today", () => {
  let p = emptyProfile();
  for (const d of ["2026-11-18", "2026-11-19", "2026-11-20"]) p = creditWord(p, 1, d).profile;
  assert.equal(streak(p, "2026-11-20"), 3);
  assert.equal(streak(p, "2026-11-21"), 3, "today empty: yesterday's streak is kept");
  assert.equal(streak(p, "2026-11-23"), 0, "a gap breaks it");
  assert.equal(streak(emptyProfile(), "2026-11-20"), 0);
});

test("bestScore keeps the maximum", () => {
  let p = bestScore(emptyProfile(), 3, 80);
  p = bestScore(p, 3, 60);
  p = bestScore(p, 3, 95);
  assert.equal(p.scores[3], 95);
});

test("clampGoal stays within 1-20 and defaults junk to 5", () => {
  assert.equal(clampGoal(0), 5);          // 0 is falsy -> default
  assert.equal(clampGoal(-4), 1);
  assert.equal(clampGoal(99), 20);
  assert.equal(clampGoal("7"), 7);
  assert.equal(clampGoal("abc"), 5);
  assert.equal(clampGoal(3.9), 3);
});

test("masteredInUnit counts only that unit", () => {
  const words = [{ id: 0, unit: 0 }, { id: 1, unit: 0 }, { id: 10, unit: 1 }];
  const p = { ...emptyProfile(), mastered: [0, 10] };
  assert.equal(masteredInUnit(p, words, 0), 1);
  assert.equal(masteredInUnit(p, words, 1), 1);
  assert.equal(masteredInUnit(p, words, 2), 0);
});
