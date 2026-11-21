// All side effects live here: they read the store, call core logic, talk to the backend, and update the store.
// Views never call these directly — they only emit data-a="..." attributes that main.js dispatches here.
import { creditWord, bestScore, clampGoal, emptyProfile } from "./core/progress.js";
import { buildQuiz, seedFromDate } from "./core/quiz.js";
import { buddyReply } from "./core/buddy.js";
import { dkey } from "./shared/dates.js";
import { writeCache } from "./backend.js";
import { speakText, listenOnce } from "./speech.js";

export function createActions({ store, backend, getWords, t, toast }) {
  const today = () => dkey(new Date());
  const word = (id) => getWords()[Number(id)];

  /** Persist: always mirror into localStorage, and (when a server exists) tell the server. Never throws. */
  async function sync(fn) {
    writeCache(store.get().profile);
    try { await fn(backend); }
    catch { toast(t("sync_fail")); }
  }

  function setProfile(profile) { store.set({ profile }); }

  function credit(id) {
    const { profile, goalJustReached } = creditWord(store.get().profile, id, today());
    setProfile(profile);
    if (goalJustReached) toast(t("goalhit"));
    return sync((b) => b.logWord(id, today()));
  }

  function newQuiz(fresh) {
    const seed = fresh ? Math.floor(Math.random() * 1e9) : seedFromDate(today());
    store.set({ quiz: buildQuiz(getWords(), seed) });
  }

  async function finishSpeak(id, res) {
    store.set({ speak: { status: "result", id, score: res.score, heard: res.heard } });
    setProfile(bestScore(store.get().profile, id, res.score));
    await sync((b) => b.saveScore(id, res.score));
    if (res.score >= 70) await credit(id);
  }

  const handlers = {
    nav: (v) => {
      if (v === "quiz") handlers.ensureQuiz();        // build BEFORE switching page, so the view never sees a missing quiz
      store.set({ page: v, speak: null });
      window.scrollTo(0, 0);
    },
    ensureQuiz: () => { if (!store.get().quiz) newQuiz(false); },
    lang: async (v) => {
      store.set((s) => ({ lang: v, chat: [], profile: { ...s.profile, lang: v } }));
      await sync((b) => b.savePrefs({ lang: v }));
    },
    unit: (v) => { store.set({ unit: +v, idx: 0, speak: null, page: "learn" }); window.scrollTo(0, 0); },
    word: (v) => store.set({ idx: +v, speak: null }),
    prev: () => store.set((s) => ({ idx: Math.max(0, s.idx - 1), speak: null })),
    next: () => store.set((s) => ({ idx: s.idx + 1, speak: null })),

    listen: (v) => { if (!speakText(word(v).en, 0.8)) toast(t("no_audio")); },
    listenSent: (v) => { if (!speakText(word(v).ex, 0.85)) toast(t("no_audio")); },
    say: (v) => { if (!speakText(v, 0.8)) toast(t("no_audio")); },

    async speak(v) {
      const id = +v, w = word(id);
      store.set({ speak: { status: "listening", id } });
      try {
        const heard = await listenOnce();
        const res = await backend.gradeSpoken(id, w.en, heard.alternatives, heard.confidence);
        await finishSpeak(id, res);
      } catch (e) {
        store.set({ speak: { status: e.code === "unsupported" ? "unsupported" : "error", id, msg: e.code } });
      }
    },
    typedMode: (v) => store.set({ speak: { status: "unsupported", id: +v } }),

    mark: (v) => credit(+v),

    pick(v) {
      const Q = store.get().quiz;
      if (!Q || Q.picked !== null || Q.done) return;
      const q = Q.qs[Q.i];
      const correct = +v === q.answer;
      store.set({ quiz: { ...Q, picked: +v, score: Q.score + (correct ? 1 : 0) } });
      if (correct) return credit(q.answer);
    },
    async nextq() {
      const Q = store.get().quiz;
      if (Q.i === Q.qs.length - 1) {
        const profile = store.get().profile;
        setProfile({ ...profile, quizzes: [...profile.quizzes, { date: today(), score: Q.score, total: Q.qs.length }] });
        store.set({ quiz: { ...Q, done: true } });
        await sync((b) => b.saveQuiz(today(), Q.score, Q.qs.length));
      } else store.set({ quiz: { ...Q, i: Q.i + 1, picked: null } });
    },
    newquiz: () => newQuiz(true),

    async goal(v) {
      const goal = clampGoal(store.get().profile.goal + Number(v));
      setProfile({ ...store.get().profile, goal });
      await sync((b) => b.savePrefs({ goal }));
    },
    async reset() {
      if (!window.confirm(t("confirm_reset"))) return;
      const { lang, goal } = store.get().profile;
      setProfile({ ...emptyProfile(), lang, goal });
      store.set({ quiz: null, speak: null });
      toast(t("reset_done"));
      await sync((b) => b.resetProgress());
    },

    chip: (v) => handlers.ask(v),
    ask(text) {
      const q = String(text ?? "").trim().slice(0, 200);
      if (!q) return;
      const r = buddyReply(q, { words: getWords(), lang: store.get().lang, t });
      store.set((s) => ({ chat: [...s.chat, { role: "me", text: q }, { role: "bot", text: r.text, say: r.say }] }));
    },
    typed(v, value) {
      const val = String(value ?? "").trim();
      if (!val) return;
      return backend.gradeSpoken(+v, word(v).en, [val], 0.9).then((res) => finishSpeak(+v, res));
    },
  };
  return handlers;
}
