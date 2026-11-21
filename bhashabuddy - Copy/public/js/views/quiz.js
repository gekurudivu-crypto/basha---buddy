import { esc, emo, ic } from "../ui/html.js";
import { blankOut } from "../core/quiz.js";

export function quizView(ctx) {
  const { s, t, words } = ctx;
  const Q = s.quiz;
  const head = `<h2>${esc(t("quiz_t"))}</h2><p class="sub">${esc(t("quiz_s"))}</p>`;

  if (Q.done) {
    const good = Q.score >= 3;
    return `<section class="narrow" style="padding-top:44px">${head}<div class="card endcard" style="margin-top:30px">${emo(good ? "🏆" : "📘")}<h2 style="margin-top:14px">${esc(t("scored", { a: Q.score, b: Q.qs.length }))}</h2><p class="sub">${esc(good ? t("effg") : t("eff"))}</p>
    <div class="row" style="justify-content:center;margin-top:26px"><button class="btn pri" data-a="newquiz">${ic("reset", 18)}${esc(t("tryagain"))}</button><button class="btn" data-a="nav" data-v="learn">${esc(t("review"))}</button></div></div></section>`;
  }

  const q = Q.qs[Q.i], w = words[q.wordId], answered = Q.picked !== null;
  let label, body;
  if (q.type === "word") {
    label = t("q_word");
    body = `<div class="qword">${emo(w.icon)}<span class="w">${esc(w.en)}</span><button class="sp" data-a="listen" data-v="${w.id}" aria-label="Listen">${ic("vol", 20)}</button></div>`;
  } else if (q.type === "def") { label = t("q_def"); body = `<div class="qtext">${esc(w.def)}</div>`; }
  else { label = t("q_fill"); body = `<div class="qtext">${esc(blankOut(w))}</div>`; }

  const optionText = (id) => (q.type === "word" ? words[id].def : words[id].en);
  const opts = q.options.map((id, k) => {
    const cls = answered ? (id === q.answer ? "right" : id === Q.picked ? "wrong" : "") : "";
    return `<button class="opt ${cls}" data-a="pick" data-v="${id}" ${answered ? "disabled" : ""}><span class="l">${"ABCD"[k]}</span><span>${esc(optionText(id))}</span></button>`;
  }).join("");

  const next = `<button class="btn sm cream" data-a="nextq">${esc(Q.i === Q.qs.length - 1 ? t("finish") : t("nextq"))}${ic("arrow", 18)}</button>`;
  let feedback = "";
  if (answered) {
    const regional = s.lang === "en" ? w.te : w[s.lang];
    feedback = Q.picked === q.answer
      ? `<div class="fb"><span>${esc(t("right"))} <b>${esc(w.en)}</b> — ${esc(regional)}</span>${next}</div>`
      : `<div class="fb"><span>${esc(t("notsure"))} <b>${esc(q.type === "word" ? w.def : w.en)}</b>${q.type === "word" ? "" : " (" + esc(w.def) + ")"}</span>${next}</div>`;
  }
  return `<section class="narrow" style="padding-top:44px">${head}<div class="qhead"><span>${esc(t("qof", { a: Q.i + 1, b: Q.qs.length }))}</span><span>✓ ${Q.score}</span></div>
   <div class="track"><i style="width:${((Q.i + (answered ? 1 : 0)) / Q.qs.length) * 100}%"></i></div>
   <div class="card qcard"><div class="lab">${esc(label)}</div>${body}<div class="opts">${opts}</div>${feedback}</div></section>`;
}
