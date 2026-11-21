import { esc, emo, ic } from "../ui/html.js";
import { wordCard } from "../ui/components.js";

export function learnView(ctx) {
  const { s, t, units, words, profile } = ctx;
  const list = words.filter((w) => w.unit === s.unit);
  const w = list[s.idx];
  const card = wordCard(ctx, w, false);
  const chips = units.map((u) => `<button class="chipb ${s.unit === u.id ? "on" : ""}" data-a="unit" data-v="${u.id}">${emo(u.icon)}${esc(u[s.lang])}</button>`).join("");
  const rows = list.map((x, i) => `<button data-a="word" data-v="${i}" class="${i === s.idx ? "on" : ""}">${emo(x.icon)}<span>${esc(x.en)}</span><span class="ok">${profile.mastered.includes(x.id) ? ic("check", 18, 3) : ""}</span></button>`).join("");
  return `<section style="padding-top:44px"><h2>${esc(t("deck_t"))}</h2><p class="sub">${esc(t("deck_s"))}</p>
   <div class="chips">${chips}</div>
   <div class="deckhead"><span>${esc(t("word_of", { a: s.idx + 1, b: list.length }))}</span><div class="row" style="gap:12px"><button class="btn sm" data-a="prev" ${s.idx === 0 ? "disabled" : ""}>${ic("left", 18)}${esc(t("prev"))}</button><button class="btn sm" data-a="next" ${s.idx === list.length - 1 ? "disabled" : ""}>${esc(t("next"))}${ic("right", 18)}</button></div></div>
   <div class="deck"><div class="card wc">${card.left}${card.right}</div><div class="card wl">${rows}</div></div></section>`;
}
