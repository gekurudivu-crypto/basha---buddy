// HTTP server: static files + JSON API, zero npm dependencies.
//   npm start            -> http://localhost:3000
//   PORT=8080 DB_FILE=./data/app.db npm start
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDb, createRepo } from "./db.js";
import { createRoutes } from "./routes.js";
import { HttpError } from "./validate.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(here, "..", "public");
const DATA_DIR = path.resolve(here, "..", "data");
const MAX_BODY = 10 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "microphone=(self), camera=()",
};

/** Tiny fixed-window rate limiter (per client IP). */
function createLimiter(max, windowMs) {
  const hits = new Map();
  return (ip) => {
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || now - h.start > windowMs) { hits.set(ip, { start: now, n: 1 }); return true; }
    h.n++;
    if (hits.size > 5000) for (const [k, x] of hits) if (now - x.start > windowMs) hits.delete(k);
    return h.n <= max;
  };
}

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== "string" && !Buffer.isBuffer(body);
  const payload = isJson ? JSON.stringify(body) : body;
  res.writeHead(status, { ...SECURITY_HEADERS, ...(isJson ? { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } : {}), ...headers });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const noBody = !Number(req.headers["content-length"] || 0) && !req.headers["transfer-encoding"];
    if (noBody) return resolve({});
    const type = req.headers["content-type"] || "";
    if (!type.startsWith("application/json")) return reject(new HttpError(415, "Content-Type must be application/json"));
    let size = 0, tooBig = false; const chunks = [];
    req.on("data", (c) => {
      if (tooBig) return;                       // keep draining, but stop buffering
      size += c.length;
      if (size > MAX_BODY) { tooBig = true; chunks.length = 0; reject(new HttpError(413, "Request body too large")); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (tooBig) return;
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); }
      catch { reject(new HttpError(400, "Body is not valid JSON")); }
    });
    req.on("error", reject);
  });
}

/** Resolve a URL path to a file inside `root`; null if it escapes the folder. */
export function safeResolve(root, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (decoded.includes("\0")) return null;
  const full = path.resolve(root, "." + path.posix.normalize("/" + decoded));
  return full === root || full.startsWith(root + path.sep) ? full : null;
}

function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed" }, { Allow: "GET, HEAD" });
  let file;
  if (pathname.startsWith("/data/")) file = safeResolve(DATA_DIR, pathname.slice(5)); // words.json + i18n.json are public
  else file = safeResolve(PUBLIC_DIR, pathname === "/" ? "/index.html" : pathname);
  if (!file) return send(res, 400, { error: "Bad path" });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, { error: "Not found" });
    const type = MIME[path.extname(file).toLowerCase()];
    if (!type) return send(res, 404, { error: "Not found" });
    res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": type, "Content-Length": st.size, "Cache-Control": "no-cache" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).on("error", () => res.destroy()).pipe(res);
  });
}

/** Build the server. `dbFile` defaults to an in-memory DB (used by the tests). */
export function createApp({ dbFile = ":memory:", rateLimit = 300 } = {}) {
  const db = openDb(dbFile);
  const routes = createRoutes(createRepo(db));
  const allowed = createLimiter(rateLimit, 60_000);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith("/api/")) return serveStatic(req, res, url.pathname);

      if (!allowed(req.socket.remoteAddress || "?")) return send(res, 429, { error: "Too many requests" }, { "Retry-After": "60" });
      const m = routes(req.method, url.pathname);
      if (!m) throw new HttpError(404, "Unknown API route");
      if (m.methodNotAllowed) throw new HttpError(405, "Method not allowed");

      const hasBody = req.method === "POST" || req.method === "PATCH";
      const body = hasBody ? await readJson(req) : undefined;
      const out = m.handler({ params: m.params, query: Object.fromEntries(url.searchParams), body });
      send(res, out.status || 200, out.body);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message }, e.status === 413 ? { Connection: "close" } : {});
      console.error("Unhandled error:", e);
      send(res, 500, { error: "Internal server error" });
    }
  });
  server.on("close", () => db.close());
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const dbFile = process.env.DB_FILE || path.resolve(here, "..", "data", "bhashabuddy.db");
  createApp({ dbFile }).listen(port, () => console.log(`BhashaBuddy running at http://localhost:${port}  (database: ${dbFile})`));
}
