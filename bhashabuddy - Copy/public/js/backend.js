// Persistence adapters. The app talks to ONE interface; which implementation is used depends on
// whether the Node + SQLite server is reachable:
//   ApiBackend    -> REST API, data in SQLite (npm start)
//   StaticBackend -> plain JSON files + this browser's localStorage (works on any static host, offline)
import { emptyProfile } from "./core/progress.js";
import { gradePronunciation } from "./shared/scoring.js";

const CACHE_KEY = "bhashabuddy.profile.v4";
const ID_KEY = "bhashabuddy.profileId.v4";

/** localStorage that never throws (private mode, blocked storage, sandboxed iframes). */
export const storage = (() => {
  const mem = new Map();
  try {
    localStorage.setItem("__bb", "1"); localStorage.removeItem("__bb");
    return localStorage;
  } catch {
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k) };
  }
})();

export function readCache() {
  try {
    const p = JSON.parse(storage.getItem(CACHE_KEY));
    if (p && typeof p === "object" && Array.isArray(p.mastered)) return { ...emptyProfile(), ...p };
  } catch { /* corrupt cache: start fresh */ }
  return emptyProfile();
}
export const writeCache = (profile) => { try { storage.setItem(CACHE_KEY, JSON.stringify(profile)); } catch { /* storage full */ } };

async function getJson(url, init, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
    return data;
  } finally { clearTimeout(timer); }
}

/** Static files only. All writes are no-ops because the store already mirrors the profile into localStorage. */
export class StaticBackend {
  mode = "static";
  async loadVocabulary() { return getJson("data/words.json"); }
  async loadProfile() { return readCache(); }
  async savePrefs() {}
  async logWord() {}
  async saveScore() {}
  async saveQuiz() {}
  async resetProgress() {}
  async gradeSpoken(_wordId, word, heard, confidence) { return gradePronunciation(word, heard, confidence); }
}

export class ApiBackend extends StaticBackend {
  mode = "api";
  async loadVocabulary() {
    const [units, words] = await Promise.all([getJson("api/units"), getJson("api/words")]);
    return { units, words };
  }
  async loadProfile() {
    const id = storage.getItem(ID_KEY);
    if (id) {
      try { return await getJson(`api/profiles/${id}`); }
      catch (e) { if (e.status !== 404 && e.status !== 400) throw e; }   // unknown id: fall through and create one
    }
    const p = await getJson("api/profiles", { method: "POST" });
    storage.setItem(ID_KEY, p.id);
    return p;
  }
  #url = (path) => `api/profiles/${storage.getItem(ID_KEY)}${path}`;
  savePrefs(prefs) { return getJson(this.#url(""), { method: "PATCH", body: JSON.stringify(prefs) }); }
  logWord(wordId, date) { return getJson(this.#url("/progress"), { method: "POST", body: JSON.stringify({ wordId, date }) }); }
  saveScore(wordId, score) { return getJson(this.#url("/scores"), { method: "POST", body: JSON.stringify({ wordId, score }) }); }
  saveQuiz(date, score, total) { return getJson(this.#url("/quizzes"), { method: "POST", body: JSON.stringify({ date, score, total }) }); }
  resetProgress() { return getJson(this.#url("/progress"), { method: "DELETE" }); }
  /** The server scores the transcript; if it is unreachable, fall back to scoring in the browser. */
  async gradeSpoken(wordId, word, heard, confidence) {
    try { return await getJson("api/transcript/match", { method: "POST", body: JSON.stringify({ wordId, heard, confidence }) }); }
    catch { return gradePronunciation(word, heard, confidence); }
  }
}

/** Use the server if it answers /api/health quickly, otherwise run fully static. */
export async function connectBackend() {
  try {
    const h = await getJson("api/health", undefined, 1500);
    if (h.ok) return new ApiBackend();
  } catch { /* no server: static mode */ }
  return new StaticBackend();
}
