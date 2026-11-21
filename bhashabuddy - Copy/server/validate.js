// Input validation. Every request body/param is checked here before it reaches the database.
import { isDateKey } from "../public/js/shared/dates.js";

export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
const bad = (msg) => { throw new HttpError(400, msg); };

export const LANGS = ["en", "te", "hi", "ta"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isProfileId = (s) => typeof s === "string" && UUID.test(s);
export const profileId = (s) => (isProfileId(s) ? s.toLowerCase() : bad("Invalid profile id"));

const isInt = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const object = (b) => (b && typeof b === "object" && !Array.isArray(b) ? b : bad("Request body must be a JSON object"));
const allow = (b, keys) => { for (const k of Object.keys(b)) if (!keys.includes(k)) bad(`Unknown field "${k}"`); };

export function wordId(n, wordCount = 50) {
  return isInt(n, 0, wordCount - 1) ? n : bad(`wordId must be an integer 0-${wordCount - 1}`);
}

export function profilePatch(body) {
  const b = object(body); allow(b, ["lang", "goal"]);
  const out = {};
  if (b.lang !== undefined) out.lang = LANGS.includes(b.lang) ? b.lang : bad(`lang must be one of ${LANGS.join(", ")}`);
  if (b.goal !== undefined) out.goal = isInt(b.goal, 1, 20) ? b.goal : bad("goal must be an integer 1-20");
  if (!Object.keys(out).length) bad("Nothing to update");
  return out;
}

export function progressBody(body) {
  const b = object(body); allow(b, ["wordId", "date"]);
  return { wordId: wordId(b.wordId), date: isDateKey(b.date) ? b.date : bad("date must be YYYY-MM-DD") };
}

export function scoreBody(body) {
  const b = object(body); allow(b, ["wordId", "score"]);
  return { wordId: wordId(b.wordId), score: isInt(b.score, 0, 100) ? b.score : bad("score must be an integer 0-100") };
}

export function quizBody(body) {
  const b = object(body); allow(b, ["date", "score", "total"]);
  if (!isDateKey(b.date)) bad("date must be YYYY-MM-DD");
  if (!isInt(b.total, 1, 50)) bad("total must be an integer 1-50");
  if (!isInt(b.score, 0, b.total)) bad("score must be between 0 and total");
  return { date: b.date, score: b.score, total: b.total };
}

export function matchBody(body) {
  const b = object(body); allow(b, ["wordId", "heard", "confidence"]);
  const heard = Array.isArray(b.heard) ? b.heard : bad("heard must be an array of strings");
  if (heard.length < 1 || heard.length > 10) bad("heard must contain 1-10 alternatives");
  if (!heard.every((h) => typeof h === "string" && h.length <= 100)) bad("each heard item must be a string up to 100 characters");
  const conf = b.confidence === undefined ? 0.9 : b.confidence;
  if (typeof conf !== "number" || !(conf >= 0 && conf <= 1)) bad("confidence must be a number 0-1");
  return { wordId: wordId(b.wordId), heard, confidence: conf };
}
