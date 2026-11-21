// Reusable pieces of UI. Pure: (ctx, data) -> HTML string. ctx = { s, t, units, words, profile, today, doneCount, streak }
import { esc, emo, ic } from "./html.js";
import { masteredInUnit } from "../core/progress.js";

export const LANGS = [["en", "EN"], ["te", "త"], ["hi", "हि"], ["ta", "த"]];
export const PAGES = ["home", "learn", "quiz", "progress", "buddy"];

export const unitName = (ctx, unitId) => ctx.units[unitId][ctx.s.lang];

export function navHtml({ s, t }) {
  return PAGES.map((p) => `<button data-a="nav" data-v="${p}" class="${s.page === p ? "on" : ""}">${esc(t(p))}</button>`).join("");
}

export function headerRightHtml({ s, profile, doneCount, streak }) {
  return `<div class="stat2"><span>${ic("target", 20)}${doneCount}/${profile.goal}</span><span class="fl">${ic("flame", 20)}<b style="color:var(--cream)">${streak}</b></span></div>
   <div class="langs">${LANGS.map(([c, n]) => `<button data-a="lang" data-v="${c}" class="${s.lang === c ? "on" : ""}" title="${c}" aria-label="${c}">${n}</button>`).join("")}</div>`;
}

export function speakBox(ctx, w) {
  const { s, t } = ctx, sp = s.speak;
  if (!sp || sp.id !== w.id) return "";
  switch (sp.status) {
    case "listening":
      return `<div class="msg"><span class="pulse">🎙️ ${esc(t("listening"))}</span></div>`;
    case "result": {
      const cls = sp.score >= 90 ? "good" : sp.score >= 70 ? "mid" : "low";
      const m = sp.score >= 96 ? "s_great" : sp.score >= 70 ? "s_good" : sp.score >= 50 ? "s_mid" : "s_low";
      return `<div class="msg"><div class="score ${cls}">${esc(t("match"))}: ${sp.score}%</div><div style="color:var(--cream)">${esc(t(m))}</div><small>${esc(t("heard"))}: “${esc(sp.heard)}”</small></div>`;
    }
    case "unsupported":
      return `<div class="msg"><p style="margin-bottom:10px">${esc(t("nomic"))}</p><form class="row" data-form="typed" data-v="${w.id}" style="flex-wrap:nowrap"><input type="text" id="typed" maxlength="40" autocomplete="off" aria-label="${esc(w.en)}" placeholder="${esc(w.en)}" style="height:46px"><button class="btn sm pri" type="submit">${esc(t("check"))}</button></form></div>`;
    case "error": {
      const blocked = sp.msg === "not-allowed" || sp.msg === "service-not-allowed";
      return `<div class="msg">${esc(blocked ? t("mic_blocked") : t("notheard"))}<br><button class="hear" data-a="typedMode" data-v="${w.id}">⌨️ ${esc(t("nomic").split(":")[0])}</button></div>`;
    }
    default:
      return "";
  }
}

export function goalCard({ t, profile, doneCount, streak }) {
  const left = Math.max(0, profile.goal - doneCount);
  return `<div class="goalrow"><span class="lab">${esc(t("today"))}</span><span><b>${doneCount}/${profile.goal}</b> <span class="sub" style="font-size:1rem">${esc(t("words"))}</span></span></div>
  <div class="track" style="margin:16px 0 14px"><i style="width:${Math.min(100, (doneCount / profile.goal) * 100)}%"></i></div>
  <div class="msg" style="margin:0">${esc(left ? t("keep", { n: left }) : t("goalhit"))}</div>
  <div class="minis"><div class="mini"><b><span class="fl" style="color:var(--teal2)">${ic("flame", 22)}</span>${streak}</b><small>${esc(t("streakl"))}</small></div><div class="mini"><b>${ic("trophy", 22)}${profile.mastered.length}</b><small>${esc(t("mastered_s"))}</small></div></div>`;
}

/** Flashcard: left panel (word + listen/speak) and right panel (meaning, example). */
export function wordCard(ctx, w, home) {
  const { s, t, profile } = ctx;
  const learned = profile.mastered.includes(w.id);
  const example = esc(w.ex).replace(new RegExp(esc(w.en), "i"), (m) => `<mark>${m}</mark>`);
  const regional = s.lang === "en" ? "" : `<div class="reg"><span>${esc(w[s.lang])}</span></div>`;
  const left = `<div class="lp"><div class="top"><span class="badge">${esc(unitName(ctx, w.unit))}</span><span class="badge cream">${esc(t("lv")[w.tier])}</span></div>
   <div>${emo(w.icon)}<div class="word">${esc(w.en)}</div><div class="phon">/${esc(w.ph)}/</div>
   <div class="row" style="margin-top:26px"><button class="btn cream" data-a="listen" data-v="${w.id}">${ic("vol", 20)}${esc(t("listen"))}</button><button class="btn aqua" data-a="speak" data-v="${w.id}">${ic("mic", 20)}${esc(t("speak"))}</button></div>
   ${home ? speakBox(ctx, w) : ""}</div></div>`;
  const right = `<div class="rp"><div class="lab">${esc(t("meaning"))}</div><div class="mean">${esc(w.def)}</div>${regional}
   <div class="lab">${esc(t("say"))}</div><div class="sayl">${esc(w.ph)}</div>
   <div class="exbox"><div class="lab" style="display:flex;gap:8px;align-items:center">${ic("quote", 18)}${esc(t("example"))}</div><div class="t">${example}</div>
    <button class="hear" data-a="listenSent" data-v="${w.id}">${ic("vol", 18)}${esc(t("hears"))}</button></div>
   <button class="btn" data-a="mark" data-v="${w.id}">${ic("check", 18)}${esc(learned ? t("marked").replace(" ✓", "") : t("mark"))}</button>${home ? "" : speakBox(ctx, w)}</div>`;
  return { left, right };
}

export function unitsBlock(ctx) {
  const { s, t, units, words, profile } = ctx;
  const cards = units.map((u) => {
    const m = masteredInUnit(profile, words, u.id);
    const sample = words.filter((x) => x.unit === u.id).slice(0, 3).map((x) => x.en).join(", ");
    return `<button class="unit" data-a="unit" data-v="${u.id}"><span class="no">0${u.id + 1}</span>${emo(u.icon)}<b>${esc(u[s.lang])}</b><small>${m}/10 · ${esc(sample)}…</small></button>`;
  }).join("");
  return `<h2>${esc(t("units_t"))}</h2><p class="sub">${esc(t("units_s"))}</p><div class="units">${cards}</div>`;
}
