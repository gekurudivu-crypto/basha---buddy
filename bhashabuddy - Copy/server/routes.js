// API routes. Each handler is (ctx) => { status?, body } and knows nothing about node:http,
// so it is easy to unit test (and easy to move onto Express later).
import crypto from "node:crypto";
import { gradePronunciation } from "../public/js/shared/scoring.js";
import * as v from "./validate.js";
import { HttpError } from "./validate.js";

export function createRoutes(repo) {
  const wordCount = repo.words().length;
  const mustHaveProfile = (id) => {
    id = v.profileId(id);
    if (!repo.hasProfile(id)) throw new HttpError(404, "Profile not found");
    return id;
  };

  /** [method, pattern, handler] — pattern segments starting with ":" are params. */
  const table = [
    ["GET", "/api/health", () => ({ body: { ok: true, words: wordCount } })],

    ["GET", "/api/units", () => ({ body: repo.units() })],

    ["GET", "/api/words", ({ query }) => {
      let unit;
      if (query.unit !== undefined) {
        unit = Number(query.unit);
        if (!Number.isInteger(unit) || unit < 0 || unit > 4) throw new HttpError(400, "unit must be an integer 0-4");
      }
      return { body: repo.words(unit) };
    }],

    ["POST", "/api/profiles", () => {
      const id = crypto.randomUUID();
      repo.createProfile(id);
      return { status: 201, body: repo.getProfile(id) };
    }],

    ["GET", "/api/profiles/:id", ({ params }) => ({ body: repo.getProfile(mustHaveProfile(params.id)) })],

    ["PATCH", "/api/profiles/:id", ({ params, body }) => {
      const id = mustHaveProfile(params.id);
      repo.updateProfile(id, v.profilePatch(body));
      return { body: repo.getProfile(id) };
    }],

    ["POST", "/api/profiles/:id/progress", ({ params, body }) => {
      const id = mustHaveProfile(params.id);
      const b = v.progressBody(body);
      v.wordId(b.wordId, wordCount);
      repo.logWord(id, b.wordId, b.date);
      return { status: 201, body: repo.getProfile(id) };
    }],

    ["DELETE", "/api/profiles/:id/progress", ({ params }) => {
      const id = mustHaveProfile(params.id);
      repo.resetProgress(id);
      return { body: repo.getProfile(id) };
    }],

    ["POST", "/api/profiles/:id/scores", ({ params, body }) => {
      const id = mustHaveProfile(params.id);
      const b = v.scoreBody(body);
      repo.saveScore(id, b.wordId, b.score);
      return { status: 201, body: repo.getProfile(id) };
    }],

    ["POST", "/api/profiles/:id/quizzes", ({ params, body }) => {
      const id = mustHaveProfile(params.id);
      const b = v.quizBody(body);
      repo.saveQuiz(id, b.date, b.score, b.total);
      return { status: 201, body: repo.getProfile(id) };
    }],

    // "Audio transcript matching": the browser sends what the recogniser heard; the server scores it.
    ["POST", "/api/transcript/match", ({ body }) => {
      const b = v.matchBody(body);
      const word = repo.word(b.wordId);
      if (!word) throw new HttpError(404, "Word not found");
      return { body: gradePronunciation(word.en, b.heard, b.confidence) };
    }],
  ];

  const compiled = table.map(([method, pattern, handler]) => ({ method, parts: pattern.split("/"), handler }));

  /** Find the route for (method, path). Returns {handler, params} | {methodNotAllowed} | null */
  return function match(method, pathname) {
    const segs = pathname.split("/");
    let pathMatched = false;
    for (const r of compiled) {
      if (r.parts.length !== segs.length) continue;
      const params = {};
      const ok = r.parts.every((p, i) => (p.startsWith(":") ? ((params[p.slice(1)] = segs[i]), segs[i] !== "") : p === segs[i]));
      if (!ok) continue;
      pathMatched = true;
      if (r.method === method) return { handler: r.handler, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  };
}
