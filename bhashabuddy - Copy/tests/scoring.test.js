import test from "node:test";
import assert from "node:assert/strict";
import { levenshtein, normalize, gradePronunciation, PASS_SCORE } from "../public/js/shared/scoring.js";

test("levenshtein: known distances", () => {
  assert.equal(levenshtein("", ""), 0);
  assert.equal(levenshtein("abc", ""), 3);
  assert.equal(levenshtein("", "abc"), 3);
  assert.equal(levenshtein("kitten", "sitting"), 3);
  assert.equal(levenshtein("algorithm", "algorithm"), 0);
  assert.equal(levenshtein("algorithm", "algoritm"), 1);
});

test("levenshtein is symmetric", () => {
  for (const [a, b] of [["voltage", "voltaj"], ["torque", "tork"], ["a", "xyz"]])
    assert.equal(levenshtein(a, b), levenshtein(b, a));
});

test("normalize strips punctuation, case and extra spaces", () => {
  assert.equal(normalize("  Al-GO  rithm! "), "algo rithm");
  assert.equal(normalize(null), "");
  assert.equal(normalize(42), "");
});

test("exact match scores 92-100 and passes", () => {
  const r = gradePronunciation("Algorithm", ["algorithm"], 1);
  assert.equal(r.score, 100);
  assert.equal(r.distance, 0);
  assert.ok(r.passed);
  assert.equal(gradePronunciation("Algorithm", ["Algorithm"], 0).score, 92);
});

test("one or two wrong letters (accent tolerance) still passes", () => {
  const one = gradePronunciation("Algorithm", ["algoritm"]);      // 1 edit
  const two = gradePronunciation("Algorithm", ["alguritum"]);     // 2 edits (o->u, h->u)
  assert.equal(one.score, 86);
  assert.equal(two.score, 78);
  assert.ok(one.passed && two.passed);
});

test("three or more edits fails and never exceeds 70", () => {
  const r = gradePronunciation("Algorithm", ["banana"]);
  assert.ok(r.score <= 70);
  assert.ok(r.score >= 10);
  assert.ok(!gradePronunciation("Torque", ["pizza"]).passed);
});

test("best alternative wins", () => {
  const r = gradePronunciation("Voltage", ["bolt age", "voltage", "volcano"]);
  assert.equal(r.heard, "voltage");
  assert.equal(r.distance, 0);
});

test("empty / junk input scores 0 instead of crashing", () => {
  assert.equal(gradePronunciation("Loop", []).score, 0);
  assert.equal(gradePronunciation("Loop", [""]).score, 0);
  assert.equal(gradePronunciation("Loop", [null, 5, undefined]).score, 0);
  assert.equal(gradePronunciation("Loop", "loop").score, 99, "a bare string is accepted too (default confidence 0.9)");
});

test("confidence is clamped and ignored when not a number", () => {
  assert.equal(gradePronunciation("Loop", ["loop"], 5).score, 100);
  assert.equal(gradePronunciation("Loop", ["loop"], -3).score, 92);
  assert.equal(gradePronunciation("Loop", ["loop"], NaN).score, Math.round(92 + 8 * 0.9));
});

test("a missing target is a programming error", () => {
  assert.throws(() => gradePronunciation("", ["x"]), TypeError);
  assert.throws(() => gradePronunciation("123", ["x"]), TypeError);
});

test("PASS_SCORE is 70", () => assert.equal(PASS_SCORE, 70));
