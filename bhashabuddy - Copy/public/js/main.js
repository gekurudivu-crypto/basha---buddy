// Entry point: connect to the backend, load data, wire store -> render, and dispatch UI events.
import { connectBackend, readCache } from "./backend.js";
import { createStore } from "./store.js";
import { createTranslator } from "./i18n.js";
import { createActions } from "./actions.js";
import { streak as calcStreak } from "./core/progress.js";
import { dkey } from "./shared/dates.js";
import { esc } from "./ui/html.js";
import { navHtml, headerRightHtml } from "./ui/components.js";
import { homeView } from "./views/home.js";
import { learnView } from "./views/learn.js";
import { quizView } from "./views/quiz.js";
import { progressView } from "./views/progress.js";
import { buddyView } from "./views/buddy.js";
import { canSpeak } from "./speech.js";

const VIEWS = { home: homeView, learn: learnView, quiz: quizView, progress: progressView, buddy: buddyView };
const $ = (sel) => document.querySelector(sel);

let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = "";
  const box = document.createElement("div");
  box.className = "toast";
  box.textContent = message;                     // textContent: never interpreted as HTML
  el.append(box);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.textContent = ""), 2800);
}

async function fetchStrings() {
  const res = await fetch("data/i18n.json");
  if (!res.ok) throw new Error("i18n.json " + res.status);
  return res.json();
}

async function boot() {
  const backend = await connectBackend();
  const [strings, vocab] = await Promise.all([fetchStrings(), backend.loadVocabulary()]);
  let profile;
  try { profile = await backend.loadProfile(); } catch { profile = readCache(); }

  const store = createStore({ page: "home", unit: 0, idx: 0, speak: null, quiz: null, chat: [], lang: profile.lang || "en", profile });
  const t = createTranslator(strings, () => store.get().lang);
  const { units, words } = vocab;
  const actions = createActions({ store, backend, getWords: () => words, t, toast });

  const makeCtx = (s) => {
    const today = dkey(new Date());
    return { s, t, units, words, profile: s.profile, today, doneCount: (s.profile.days[today] || []).length, streak: calcStreak(s.profile, today) };
  };

  function render(s) {
    const ctx = makeCtx(s);
    document.documentElement.lang = s.lang;
    $("#nav").innerHTML = navHtml(ctx);
    $("#right").innerHTML = headerRightHtml(ctx);
    $("#made").textContent = t("made");
    if (s.page === "buddy" && !s.chat.length) { store.set({ chat: [{ role: "bot", text: t("greet") }] }); return; }
    if (s.page === "quiz" && !s.quiz) { actions.ensureQuiz(); return; }
    const typedValue = document.activeElement?.id === "typed" ? document.activeElement.value : null;
    $("#app").innerHTML = VIEWS[s.page](ctx);
    const chat = $("#chat"); if (chat) chat.scrollTop = chat.scrollHeight;
    if (typedValue !== null && $("#typed")) { $("#typed").value = typedValue; $("#typed").focus(); }
  }
  store.subscribe(render);

  // one delegated listener for every button: <button data-a="action" data-v="value">
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-a]");
    if (!el || !(el.dataset.a in actions)) return;
    try { await actions[el.dataset.a](el.dataset.v); } catch (err) { console.error(err); toast(t("sync_fail")); }
  });
  document.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector("input[type=text]");
    const value = input.value;
    try {
      if (form.dataset.form === "chat") { input.value = ""; actions.ask(value); }
      else if (form.dataset.form === "typed") await actions.typed(form.dataset.v, value);
    } catch (err) { console.error(err); toast(t("sync_fail")); }
  });
  window.addEventListener("unhandledrejection", (e) => { console.error(e.reason); });

  if (canSpeak()) speechSynthesis.getVoices();        // warm up the voice list
  render(store.get());

  // offline support (stretch feature): cache the app shell so drills work on poor connections
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

boot().catch((err) => {
  console.error(err);
  $("#app").innerHTML = `<section style="padding:80px 0"><h2>BhashaBuddy</h2><p class="sub">${esc("Could not load the word list. Please refresh the page.")}</p></section>`;
});
