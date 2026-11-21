import { esc, emo, ic } from "../ui/html.js";
import { goalCard } from "../ui/components.js";
import { masteredInUnit } from "../core/progress.js";

export function progressView(ctx) {
  const { s, t, units, words, profile } = ctx;
  const none = `<p class="sub" style="margin:0">${esc(t("nothing"))}</p>`;
  const byUnit = units.map((u) => {
    const m = masteredInUnit(profile, words, u.id);
    return `<div class="mrow"><div class="t"><span>${emo(u.icon)}${esc(u[s.lang])}</span><span>${m}/10</span></div><div class="track"><i style="width:${m * 10}%"></i></div></div>`;
  }).join("");
  const best = Object.entries(profile.scores).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, sc]) => `<div class="li"><span>${esc(words[id]?.en ?? id)}</span><b>${Number(sc)}%</b></div>`).join("") || none;
  const recent = profile.quizzes.slice(-5).reverse()
    .map((q) => `<div class="li"><span>${esc(q.date)}</span><b>${Number(q.score)}/${Number(q.total)}</b></div>`).join("") || none;
  return `<section style="padding-top:44px"><h2>${esc(t("prog_t"))}</h2><p class="sub">${esc(t("prog_s"))}</p><div class="pgrid">
   <div class="stack"><div class="card pc">${goalCard(ctx)}</div>
    <div class="card pc"><div class="lab">${esc(t("goal_h"))}</div><div class="stepper"><button data-a="goal" data-v="-1" aria-label="less">${ic("minus", 18)}</button><b>${profile.goal}</b><button data-a="goal" data-v="1" aria-label="more">${ic("plus", 18)}</button><span class="sub" style="margin:0;font-size:1rem">${esc(t("perday"))}</span></div></div>
    <button class="reset" data-a="reset">${ic("reset", 20)}${esc(t("reset"))}</button></div>
   <div class="stack"><div class="card pc"><h3>${esc(t("bu"))}</h3>${byUnit}</div>
    <div class="row" style="align-items:stretch;flex-wrap:nowrap;gap:24px"><div class="card pc" style="flex:1"><h3>${esc(t("best"))}</h3>${best}</div><div class="card pc" style="flex:1"><h3>${esc(t("recent"))}</h3>${recent}</div></div></div></div></section>`;
}
