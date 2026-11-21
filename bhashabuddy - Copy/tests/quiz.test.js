import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildQuiz, blankOut, rng, seedFromDate, QUIZ_LENGTH } from "../public/js/core/quiz.js";

const { words } = JSON.parse(fs.readFileSync(new URL("../data/words.json", import.meta.url), "utf8"));

test("rng is deterministic and within [0,1)", () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 20; i++) { const x = a(); assert.equal(x, b()); assert.ok(x >= 0 && x < 1); }
});

test("same seed gives the same quiz; different seed differs", () => {
  const q1 = buildQuiz(words, seedFromDate("2026-11-20"));
  const q2 = buildQuiz(words, seedFromDate("2026-11-20"));
  const q3 = buildQuiz(words, seedFromDate("2026-11-21"));
  assert.deepEqual(q1, q2);
  assert.notDeepEqual(q1.qs.map((q) => q.wordId), q3.qs.map((q) => q.wordId));
});

test("quiz has 5 questions, types word/def/fill/word/def", () => {
  const q = buildQuiz(words, 1);
  assert.equal(q.qs.length, QUIZ_LENGTH);
  assert.deepEqual(q.qs.map((x) => x.type), ["word", "def", "fill", "word", "def"]);
  assert.deepEqual([q.i, q.picked, q.score, q.done], [0, null, 0, false]);
});

test("each question: 4 unique options, includes the answer, distractors from same unit", () => {
  for (let seed = 0; seed < 50; seed++) {
    const q = buildQuiz(words, seed);
    assert.equal(new Set(q.qs.map((x) => x.wordId)).size, 5, "questions are different words");
    for (const x of q.qs) {
      assert.equal(x.options.length, 4);
      assert.equal(new Set(x.options).size, 4);
      assert.ok(x.options.includes(x.answer));
      const unit = words[x.answer].unit;
      for (const id of x.options) assert.equal(words[id].unit, unit);
    }
  }
});

test("blankOut hides the word, any case", () => {
  assert.equal(blankOut({ en: "Algorithm", ex: "We wrote an algorithm to sort." }), "We wrote an _____ to sort.");
  assert.equal(blankOut({ en: "Loop", ex: "Loop through it." }), "_____ through it.");
});

test("too few words is rejected", () => {
  assert.throws(() => buildQuiz(words.slice(0, 3), 1), /at least 4/);
  assert.throws(() => buildQuiz(null, 1));
});
