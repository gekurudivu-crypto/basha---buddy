// Rule-based "Buddy" chatbot. Pure: takes the question, the word list and a translate function.

export function findWord(question, words) {
  const s = question.toLowerCase();
  const byEnglish = words.find((w) => s.includes(w.en.toLowerCase()));
  if (byEnglish) return byEnglish;
  // also match a regional-language term typed by the student (e.g. "అల్గోరిథం")
  return words.find((w) =>
    [w.te, w.hi, w.ta].some((x) => x.split(/[ ()]+/).some((p) => p.length > 2 && question.includes(p))));
}

const TIPS = {
  en: "Interview tips:\n1) Smile and greet clearly.\n2) Say “Thank you for the opportunity.”\n3) Describe your strength with an example.\n4) Speak slowly — clear is better than fast.",
  te: "ఇంటర్వ్యూ చిట్కాలు:\n1) నవ్వుతూ స్పష్టంగా నమస్కారం చెప్పండి.\n2) “Thank you for the opportunity” అనండి.\n3) మీ బలాన్ని ఒక ఉదాహరణతో చెప్పండి.\n4) నెమ్మదిగా, స్పష్టంగా మాట్లాడండి.",
  hi: "इंटरव्यू टिप्स:\n1) मुस्कुराकर साफ़ अभिवादन करें।\n2) “Thank you for the opportunity” कहें।\n3) अपनी ताकत को उदाहरण के साथ बताएँ।\n4) धीरे और साफ़ बोलें।",
  ta: "நேர்காணல் குறிப்புகள்:\n1) புன்னகையுடன் தெளிவாக வணக்கம் சொல்லுங்கள்.\n2) “Thank you for the opportunity” என்று சொல்லுங்கள்.\n3) உங்கள் பலத்தை எடுத்துக்காட்டுடன் சொல்லுங்கள்.\n4) மெதுவாகத் தெளிவாகப் பேசுங்கள்.",
};
const UNKNOWN = {
  en: "I don't know that word yet. Try one from the deck — for example Algorithm, Voltage, Resume or Deadline.",
  te: "ఆ పదం నాకు ఇంకా తెలియదు. డెక్‌లోని పదం ప్రయత్నించండి — ఉదా: Algorithm, Voltage, Resume, Deadline.",
  hi: "यह शब्द मुझे अभी नहीं पता। डेक का कोई शब्द आज़माएँ — जैसे Algorithm, Voltage, Resume, Deadline।",
  ta: "அந்தச் சொல் எனக்கு இன்னும் தெரியாது. தொகுப்பிலிருந்து ஒன்றை முயலுங்கள் — எ.கா: Algorithm, Voltage, Resume, Deadline.",
};

/** @returns {{text:string, say?:string}} */
export function buddyReply(question, { words, lang, t }) {
  const q = String(question ?? "").trim().slice(0, 200);
  const s = q.toLowerCase();
  const hit = findWord(q, words);
  if (hit) {
    return { text: t("tpl", { w: hit.en, te: hit.te, hi: hit.hi, ta: hit.ta, def: hit.def, ph: hit.ph, ex: hit.ex }), say: hit.en };
  }
  if (/interview|tips|placement/.test(s)) return { text: TIPS[lang] || TIPS.en };
  if (/^(hi|hello|hey|namaste|vanakkam)|నమస్|नमस्|வணக்கம்/.test(s)) return { text: t("greet") };
  return { text: UNKNOWN[lang] || UNKNOWN.en };
}
