// Localisation: strings live in data/i18n.json, this module only does lookup + {placeholder} filling.
export function createTranslator(strings, getLang) {
  return function t(key, vars) {
    let s = strings[getLang()]?.[key] ?? strings.en?.[key];
    if (typeof s !== "string") return s ?? key;       // objects (levels, suggestion lists) are returned as-is
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  };
}
