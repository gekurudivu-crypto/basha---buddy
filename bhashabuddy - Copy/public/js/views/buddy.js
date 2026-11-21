import { esc, ic } from "../ui/html.js";

export const MAX_CHAT_LENGTH = 200;

export function buddyView({ s, t }) {
  const bubbles = s.chat.map((c) => `<div class="bub ${c.role === "me" ? "me" : ""}">${c.role === "bot" ? `<div class="av">${ic("bot", 22)}</div>` : ""}<div class="bt">${esc(c.text)}${c.say ? `<br><button class="hear" data-a="say" data-v="${esc(c.say)}">${ic("vol", 18)}${esc(c.say)}</button>` : ""}</div></div>`).join("");
  const suggestions = Array.isArray(t("sugg")) ? t("sugg") : [];
  return `<section class="narrow" style="padding-top:44px"><h2>${esc(t("buddy_t"))}</h2><p class="sub">${esc(t("buddy_s"))}</p>
   <div class="card chatcard" style="margin-top:30px"><div class="chat" id="chat" aria-live="polite">${bubbles}</div>
    <div class="composer"><div class="sug"><span>${esc(t("tryask"))}</span>${suggestions.map((x) => `<button data-a="chip" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div>
     <form class="row" data-form="chat" style="flex-wrap:nowrap;gap:12px"><input type="text" id="chatin" maxlength="${MAX_CHAT_LENGTH}" aria-label="${esc(t("buddy_t"))}" placeholder="${esc(t("ph"))}" autocomplete="off"><button class="btn big pri" type="submit">${ic("send", 20)}${esc(t("send"))}</button></form></div></div></section>`;
}
