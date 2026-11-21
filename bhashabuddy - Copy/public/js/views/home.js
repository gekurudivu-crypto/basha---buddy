import { esc, ic } from "../ui/html.js";
import { heroBg } from "../ui/hero.js";
import { wordCard, goalCard, unitsBlock } from "../ui/components.js";

export function homeView(ctx) {
  const { t, words } = ctx;
  const first = words[0], card = wordCard(ctx, first, true);
  const how = [["globe", "h1t", "h1d"], ["vol", "h2t", "h2d"], ["mic", "h3t", "h3d"], ["trend", "h4t", "h4d"]]
    .map(([i, a, b]) => `<div class="card"><div class="ic">${ic(i, 24)}</div><b>${esc(t(a))}</b><span>${esc(t(b))}</span></div>`).join("");
  return `<div class="full hero">${heroBg()}<div class="grid"></div><div class="in"><div class="heroin">
    <div><span class="tag">${esc(t("tag"))}</span><h1>${esc(t("hero_t"))}</h1><p class="lead">${esc(t("hero_s"))}</p>
     <div class="ctas"><button class="btn big pri" data-a="nav" data-v="learn">${esc(t("start"))} ${ic("arrow", 20)}</button><button class="btn big dark" data-a="nav" data-v="quiz">${esc(t("try_quiz"))}</button></div></div>
    <div class="pw"><div class="poster posterimg" role="img" aria-label="An Indian college zine cover: a student with earphones, with the Telugu and Hindi word for knowledge and time"><span class="v">VOL. 01</span></div>
     <span class="volpill">VOL.01 / TECH ENGLISH</span><span class="chipalg">Algorithm = ${esc(first.te)}</span></div></div></div></div>
   <section><h2>${esc(t("tryit"))}</h2><p class="sub">${esc(t("tryit_s"))}</p>
    <div class="try"><div class="card wc">${card.left}${card.right}</div><div class="card gc">${goalCard(ctx)}</div></div></section>
   <div class="full band"><div class="in"><h2>${esc(t("how"))}</h2><div class="how">${how}</div></div></div>
   <section style="padding-top:64px">${unitsBlock(ctx)}</section>`;
}
