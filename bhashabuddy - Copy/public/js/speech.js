// Browser Web Speech API wrappers. No DOM, no app state: callers decide what to do with results/errors.
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

export const canRecognise = () => !!SR;
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Read text aloud with an Indian-English voice when one exists. Returns false if audio is unavailable. */
export function speakText(text, rate = 0.85) {
  if (!canSpeak()) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN"; u.rate = rate;
    const voices = speechSynthesis.getVoices();
    const v = voices.find((x) => /en[-_]IN/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

/**
 * Listen once. Resolves { alternatives: string[], confidence } or rejects with an Error whose
 * `code` is one of: "unsupported" | "no-speech" | "not-allowed" | "service-not-allowed" | "network" | "aborted" | ...
 */
export function listenOnce() {
  return new Promise((resolve, reject) => {
    const fail = (code) => reject(Object.assign(new Error(code), { code }));
    if (!SR) return fail("unsupported");
    let settled = false;
    try {
      const r = new SR();
      r.lang = "en-IN"; r.maxAlternatives = 5; r.interimResults = false;
      r.onresult = (e) => {
        settled = true;
        const res = e.results[0];
        resolve({ alternatives: [...res].map((a) => a.transcript), confidence: res[0].confidence || 0.9 });
      };
      r.onerror = (e) => { if (!settled) { settled = true; fail(e.error || "error"); } };
      r.onend = () => { if (!settled) { settled = true; fail("no-speech"); } };
      r.start();
    } catch { fail("unsupported"); }
  });
}
