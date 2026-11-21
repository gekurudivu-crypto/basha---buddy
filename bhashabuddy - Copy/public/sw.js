// Service worker: caches the app shell + vocabulary so pronunciation drills work offline / on weak networks.
// API calls are never cached (the app falls back to localStorage when the server is unreachable).
const CACHE = "bhashabuddy-v5";
const SHELL = [
  "./", "index.html", "css/styles.css", "poster.jpg", "data/words.json", "data/i18n.json",
  "js/main.js", "js/store.js", "js/i18n.js", "js/backend.js", "js/speech.js", "js/actions.js",
  "js/shared/scoring.js", "js/shared/dates.js",
  "js/core/progress.js", "js/core/quiz.js", "js/core/buddy.js",
  "js/ui/html.js", "js/ui/hero.js", "js/ui/components.js",
  "js/views/home.js", "js/views/learn.js", "js/views/quiz.js", "js/views/progress.js", "js/views/buddy.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/api/")) return;
  // network first (so updates show up), cache as the offline fallback
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))),
  );
});
