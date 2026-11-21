// SQLite storage (Node's built-in node:sqlite). Tables follow the brief:
// UserProfiles, VocabularyUnits (+Words), ProgressLogs, PronunciationScores, QuizResults.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const WORDS_FILE = path.join(here, "..", "data", "words.json");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS UserProfiles (
  id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en', goal INTEGER NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS VocabularyUnits (
  id INTEGER PRIMARY KEY, icon TEXT NOT NULL, en TEXT NOT NULL, te TEXT NOT NULL, hi TEXT NOT NULL, ta TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS Words (
  id INTEGER PRIMARY KEY, unit_id INTEGER NOT NULL REFERENCES VocabularyUnits(id),
  en TEXT NOT NULL, ph TEXT NOT NULL, te TEXT NOT NULL, hi TEXT NOT NULL, ta TEXT NOT NULL,
  def TEXT NOT NULL, ex TEXT NOT NULL, tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 3), icon TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ProgressLogs (
  profile_id TEXT NOT NULL REFERENCES UserProfiles(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES Words(id), day TEXT NOT NULL,
  PRIMARY KEY (profile_id, word_id, day));
CREATE TABLE IF NOT EXISTS PronunciationScores (
  profile_id TEXT NOT NULL REFERENCES UserProfiles(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES Words(id), best_score INTEGER NOT NULL,
  PRIMARY KEY (profile_id, word_id));
CREATE TABLE IF NOT EXISTS QuizResults (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL REFERENCES UserProfiles(id) ON DELETE CASCADE,
  day TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL);
`;

/** Open (or create) the database and load the vocabulary from data/words.json. */
export function openDb(file = ":memory:") {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  seedVocabulary(db);
  return db;
}

function seedVocabulary(db) {
  const { units, words } = JSON.parse(fs.readFileSync(WORDS_FILE, "utf8"));
  const insU = db.prepare("INSERT OR REPLACE INTO VocabularyUnits (id,icon,en,te,hi,ta) VALUES (?,?,?,?,?,?)");
  const insW = db.prepare("INSERT OR REPLACE INTO Words (id,unit_id,en,ph,te,hi,ta,def,ex,tier,icon) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  db.exec("BEGIN");
  try {
    for (const u of units) insU.run(u.id, u.icon, u.en, u.te, u.hi, u.ta);
    for (const w of words) insW.run(w.id, w.unit, w.en, w.ph, w.te, w.hi, w.ta, w.def, w.ex, w.tier, w.icon);
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}

const rowToWord = (r) => ({ id: r.id, unit: r.unit_id, en: r.en, ph: r.ph, te: r.te, hi: r.hi, ta: r.ta, def: r.def, ex: r.ex, tier: r.tier, icon: r.icon });

/** Data-access layer: every SQL statement lives here, nothing else touches the database. */
export function createRepo(db) {
  const q = (sql) => db.prepare(sql);
  const s = {
    units: q("SELECT * FROM VocabularyUnits ORDER BY id"),
    words: q("SELECT * FROM Words ORDER BY id"),
    wordsByUnit: q("SELECT * FROM Words WHERE unit_id = ? ORDER BY id"),
    word: q("SELECT * FROM Words WHERE id = ?"),
    newProfile: q("INSERT INTO UserProfiles (id) VALUES (?)"),
    profile: q("SELECT * FROM UserProfiles WHERE id = ?"),
    setLang: q("UPDATE UserProfiles SET lang = ? WHERE id = ?"),
    setGoal: q("UPDATE UserProfiles SET goal = ? WHERE id = ?"),
    log: q("INSERT OR IGNORE INTO ProgressLogs (profile_id,word_id,day) VALUES (?,?,?)"),
    logs: q("SELECT word_id, day FROM ProgressLogs WHERE profile_id = ? ORDER BY day, word_id"),
    score: q(`INSERT INTO PronunciationScores (profile_id,word_id,best_score) VALUES (?,?,?)
              ON CONFLICT(profile_id,word_id) DO UPDATE SET best_score = MAX(best_score, excluded.best_score)`),
    scores: q("SELECT word_id, best_score FROM PronunciationScores WHERE profile_id = ?"),
    addQuiz: q("INSERT INTO QuizResults (profile_id,day,score,total) VALUES (?,?,?,?)"),
    quizzes: q("SELECT day, score, total FROM QuizResults WHERE profile_id = ? ORDER BY id DESC LIMIT 20"),
    clearLogs: q("DELETE FROM ProgressLogs WHERE profile_id = ?"),
    clearScores: q("DELETE FROM PronunciationScores WHERE profile_id = ?"),
    clearQuizzes: q("DELETE FROM QuizResults WHERE profile_id = ?"),
  };
  return {
    units: () => s.units.all(),
    words: (unit) => (unit == null ? s.words.all() : s.wordsByUnit.all(unit)).map(rowToWord),
    word: (id) => { const r = s.word.get(id); return r ? rowToWord(r) : null; },
    createProfile: (id) => { s.newProfile.run(id); },
    hasProfile: (id) => !!s.profile.get(id),
    /** Full profile in the same shape the frontend uses. */
    getProfile(id) {
      const p = s.profile.get(id);
      if (!p) return null;
      const days = {}, mastered = new Set();
      for (const l of s.logs.all(id)) { (days[l.day] ||= []).push(l.word_id); mastered.add(l.word_id); }
      const scores = {};
      for (const r of s.scores.all(id)) scores[r.word_id] = r.best_score;
      // newest 20 from the DB, oldest-first for the client (it shows the last 5 reversed)
      const quizzes = s.quizzes.all(id).reverse().map((r) => ({ date: r.day, score: r.score, total: r.total }));
      return { id: p.id, lang: p.lang, goal: p.goal, mastered: [...mastered], days, scores, quizzes };
    },
    updateProfile(id, { lang, goal }) {
      if (lang !== undefined) s.setLang.run(lang, id);
      if (goal !== undefined) s.setGoal.run(goal, id);
    },
    logWord: (id, wordId, day) => { s.log.run(id, wordId, day); },
    saveScore: (id, wordId, score) => { s.score.run(id, wordId, score); },
    saveQuiz: (id, day, score, total) => { s.addQuiz.run(id, day, score, total); },
    resetProgress(id) {
      db.exec("BEGIN");
      try { s.clearLogs.run(id); s.clearScores.run(id); s.clearQuizzes.run(id); db.exec("COMMIT"); }
      catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
}
