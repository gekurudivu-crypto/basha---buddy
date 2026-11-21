import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp, safeResolve } from "../server/index.js";

let server, base;
before(async () => {
  server = createApp({ rateLimit: 100000 });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((r) => server.close(r)));

const call = async (method, path, body) => {
  const res = await fetch(base + path, {
    method, headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text, headers: res.headers };
};
const newProfile = async () => (await call("POST", "/api/profiles")).json;

test("health + vocabulary comes from SQLite", async () => {
  assert.deepEqual((await call("GET", "/api/health")).json, { ok: true, words: 50 });
  const units = (await call("GET", "/api/units")).json;
  assert.equal(units.length, 5);
  const words = (await call("GET", "/api/words")).json;
  assert.equal(words.length, 50);
  assert.equal(words[0].en, "Algorithm");
  assert.ok(words[0].te.includes("క్రమ"));
  const u2 = (await call("GET", "/api/words?unit=2")).json;
  assert.equal(u2.length, 10);
  assert.ok(u2.every((w) => w.unit === 2));
});

test("words?unit validates its input", async () => {
  for (const bad of ["9", "-1", "abc", "1.5"]) assert.equal((await call("GET", `/api/words?unit=${bad}`)).status, 400, bad);
});

test("create profile, then read it back", async () => {
  const p = await newProfile();
  assert.match(p.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual({ lang: p.lang, goal: p.goal, mastered: p.mastered }, { lang: "en", goal: 5, mastered: [] });
  assert.deepEqual((await call("GET", `/api/profiles/${p.id}`)).json, p);
});

test("unknown profile -> 404, malformed id -> 400", async () => {
  assert.equal((await call("GET", "/api/profiles/3b241101-e2bb-4255-8caf-4136c566a962")).status, 404);
  assert.equal((await call("GET", "/api/profiles/not-a-uuid")).status, 400);
  assert.equal((await call("GET", "/api/profiles/1%27%20OR%20%271%27=%271")).status, 400);
});

test("patch lang and goal; reject bad values and unknown fields", async () => {
  const { id } = await newProfile();
  const ok = await call("PATCH", `/api/profiles/${id}`, { lang: "te", goal: 8 });
  assert.equal(ok.status, 200);
  assert.deepEqual([ok.json.lang, ok.json.goal], ["te", 8]);
  for (const bad of [{ lang: "fr" }, { goal: 0 }, { goal: 21 }, { goal: 2.5 }, { goal: "5" }, {}, { admin: true }, [1], "x"])
    assert.equal((await call("PATCH", `/api/profiles/${id}`, bad)).status, 400, JSON.stringify(bad));
});

test("progress: logs words per day, mastered is distinct, repeat is idempotent", async () => {
  const { id } = await newProfile();
  await call("POST", `/api/profiles/${id}/progress`, { wordId: 3, date: "2026-11-19" });
  await call("POST", `/api/profiles/${id}/progress`, { wordId: 3, date: "2026-11-20" });
  const r = await call("POST", `/api/profiles/${id}/progress`, { wordId: 3, date: "2026-11-20" });
  assert.equal(r.status, 201);
  assert.deepEqual(r.json.mastered, [3]);
  assert.deepEqual(r.json.days, { "2026-11-19": [3], "2026-11-20": [3] });
});

test("progress validation", async () => {
  const { id } = await newProfile();
  const bads = [{ wordId: 50, date: "2026-11-20" }, { wordId: -1, date: "2026-11-20" }, { wordId: "3", date: "2026-11-20" },
    { wordId: 3, date: "20-11-2026" }, { wordId: 3 }, { date: "2026-11-20" }, { wordId: 3, date: "2026-02-30x" }];
  for (const b of bads) assert.equal((await call("POST", `/api/profiles/${id}/progress`, b)).status, 400, JSON.stringify(b));
});

test("scores keep the best value", async () => {
  const { id } = await newProfile();
  await call("POST", `/api/profiles/${id}/scores`, { wordId: 7, score: 80 });
  await call("POST", `/api/profiles/${id}/scores`, { wordId: 7, score: 55 });
  const r = await call("POST", `/api/profiles/${id}/scores`, { wordId: 7, score: 91 });
  assert.equal(r.json.scores["7"], 91);
  assert.equal((await call("POST", `/api/profiles/${id}/scores`, { wordId: 7, score: 101 })).status, 400);
});

test("quiz results are stored; score must be <= total", async () => {
  const { id } = await newProfile();
  const r = await call("POST", `/api/profiles/${id}/quizzes`, { date: "2026-11-20", score: 4, total: 5 });
  assert.deepEqual(r.json.quizzes, [{ date: "2026-11-20", score: 4, total: 5 }]);
  assert.equal((await call("POST", `/api/profiles/${id}/quizzes`, { date: "2026-11-20", score: 6, total: 5 })).status, 400);
});

test("reset progress clears logs, scores and quizzes but keeps the profile settings", async () => {
  const { id } = await newProfile();
  await call("PATCH", `/api/profiles/${id}`, { goal: 9 });
  await call("POST", `/api/profiles/${id}/progress`, { wordId: 1, date: "2026-11-20" });
  await call("POST", `/api/profiles/${id}/scores`, { wordId: 1, score: 90 });
  await call("POST", `/api/profiles/${id}/quizzes`, { date: "2026-11-20", score: 3, total: 5 });
  const r = await call("DELETE", `/api/profiles/${id}/progress`);
  assert.deepEqual([r.json.mastered, r.json.days, r.json.scores, r.json.quizzes, r.json.goal], [[], {}, {}, [], 9]);
});

test("profiles are isolated from each other", async () => {
  const a = await newProfile(), b = await newProfile();
  await call("POST", `/api/profiles/${a.id}/progress`, { wordId: 2, date: "2026-11-20" });
  assert.deepEqual((await call("GET", `/api/profiles/${b.id}`)).json.mastered, []);
});

test("transcript matching: exact, accent-tolerant, wrong, and invalid", async () => {
  const m = (b) => call("POST", "/api/transcript/match", b);
  const exact = (await m({ wordId: 0, heard: ["algorithm"], confidence: 1 })).json;
  assert.deepEqual([exact.score, exact.passed], [100, true]);
  const accent = (await m({ wordId: 0, heard: ["algoritm", "elgoritham"] })).json;
  assert.ok(accent.passed);
  assert.equal((await m({ wordId: 0, heard: ["banana"] })).json.passed, false);
  for (const bad of [{ wordId: 0 }, { wordId: 0, heard: [] }, { wordId: 0, heard: "algorithm" }, { wordId: 0, heard: [1] },
    { wordId: 0, heard: ["x".repeat(101)] }, { wordId: 0, heard: ["a"], confidence: 2 }, { wordId: 99, heard: ["a"] }])
    assert.equal((await m(bad)).status, 400, JSON.stringify(bad));
});

test("bad JSON -> 400, wrong content-type -> 415, huge body -> 413", async () => {
  const { id } = await newProfile();
  assert.equal((await call("PATCH", `/api/profiles/${id}`, "{not json")).status, 400);
  const res = await fetch(`${base}/api/profiles/${id}`, { method: "PATCH", headers: { "content-type": "text/plain" }, body: "lang=te" });
  assert.equal(res.status, 415);
  const big = await call("PATCH", `/api/profiles/${id}`, JSON.stringify({ lang: "en", pad: "x".repeat(20000) }));
  assert.equal(big.status, 413);
});

test("unknown API route -> 404 JSON, wrong method -> 405", async () => {
  const r = await call("GET", "/api/nope");
  assert.equal(r.status, 404);
  assert.ok(r.json.error);
  assert.equal((await call("DELETE", "/api/words")).status, 405);
  assert.equal((await call("GET", "/api/transcript/match")).status, 405);
});

test("SQL-injection style input is harmless", async () => {
  const { id } = await newProfile();
  assert.equal((await call("POST", `/api/profiles/${id}/progress`, { wordId: "1; DROP TABLE Words", date: "2026-11-20" })).status, 400);
  assert.equal((await call("GET", "/api/words")).json.length, 50);
});

test("static files: index is served with security headers; traversal is blocked", async () => {
  const idx = await call("GET", "/");
  assert.equal(idx.status, 200);
  assert.match(idx.headers.get("content-type"), /text\/html/);
  assert.equal(idx.headers.get("x-content-type-options"), "nosniff");
  assert.match(idx.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal((await call("GET", "/js/main.js")).status, 200);
  assert.equal((await call("GET", "/data/words.json")).status, 200);
  assert.equal((await call("GET", "/data/bhashabuddy.db")).status, 404);   // only whitelisted types are served
  assert.equal((await call("GET", "/nothing.html")).status, 404);
  assert.equal((await call("POST", "/index.html", {})).status, 405);
});

test("path traversal never leaves the public folder (raw socket, unnormalised path)", async () => {
  const raw = (path) => new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port: server.address().port, path, method: "GET" }, (res) => { res.resume(); resolve(res.statusCode); });
    req.end();
  });
  for (const p of ["/../server/db.js", "/..%2f..%2fpackage.json", "/%2e%2e/%2e%2e/etc/passwd", "/..%00/x", "/%E0%A4%A"])
    assert.ok([400, 404].includes(await raw(p)), p);
});

test("safeResolve unit checks", () => {
  const root = "/srv/public";
  assert.equal(safeResolve(root, "/a/b.js"), "/srv/public/a/b.js");
  assert.equal(safeResolve(root, "/../etc/passwd"), "/srv/public/etc/passwd"); // normalised inside root
  assert.equal(safeResolve(root, "/%2e%2e/x"), "/srv/public/x");
  assert.equal(safeResolve(root, "/%"), null);
  assert.equal(safeResolve(root, "/a%00b"), null);
});

test("rate limiting kicks in", async () => {
  const s = createApp({ rateLimit: 5 });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${s.address().port}/api/health`;
  const codes = [];
  for (let i = 0; i < 8; i++) codes.push((await fetch(url)).status);
  await new Promise((r) => s.close(r));
  assert.deepEqual(codes.slice(0, 5), [200, 200, 200, 200, 200]);
  assert.deepEqual(codes.slice(5), [429, 429, 429]);
});
