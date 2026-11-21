import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const { units, words } = read("words.json");
const i18n = read("i18n.json");

test("exactly 5 units and 50 words, 10 per unit, ids 0..49", () => {
  assert.equal(units.length, 5);
  assert.equal(words.length, 50);
  words.forEach((w, i) => { assert.equal(w.id, i); assert.equal(w.unit, Math.floor(i / 10)); });
});

test("every word has all fields filled in all languages", () => {
  for (const w of words) {
    for (const k of ["en", "ph", "te", "hi", "ta", "def", "ex", "icon"]) assert.ok(typeof w[k] === "string" && w[k].trim(), `${w.en}.${k}`);
    assert.ok([1, 2, 3].includes(w.tier), `${w.en} tier`);
    assert.match(w.en, /^[A-Za-z]+$/, "English term must be a single plain word (needed by the pronunciation matcher)");
    assert.ok(new RegExp(w.en, "i").test(w.ex), `${w.en}: example sentence must contain the word`);
  }
});

test("Telugu / Hindi / Tamil fields really use their own scripts", () => {
  for (const w of words) {
    assert.match(w.te, /[ఀ-౿]/, `${w.en} Telugu`);
    assert.match(w.hi, /[ऀ-ॿ]/, `${w.en} Hindi`);
    assert.match(w.ta, /[஀-௿]/, `${w.en} Tamil`);
  }
});

test("no duplicate words", () => {
  assert.equal(new Set(words.map((w) => w.en.toLowerCase())).size, 50);
});

test("every language has the same UI keys as English", () => {
  const keys = Object.keys(i18n.en).sort();
  for (const l of ["te", "hi", "ta"]) assert.deepEqual(Object.keys(i18n[l]).sort(), keys, `${l} keys`);
});

test("placeholders like {a} {b} {n} {w} survive translation", () => {
  const ph = (s) => (typeof s === "string" ? (s.match(/\{\w+\}/g) || []).sort().join() : "");
  for (const k of ["scored", "qof", "word_of", "keep"])
    for (const l of ["te", "hi", "ta"]) assert.equal(ph(i18n[l][k]), ph(i18n.en[k]), `${l}.${k}`);
  for (const l of ["te", "hi", "ta"]) assert.equal(ph(i18n[l].tpl).includes("{def}"), true, `${l}.tpl keeps {def}`);
});
