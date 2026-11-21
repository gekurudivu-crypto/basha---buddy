// Local-date helpers. Dates are plain "YYYY-MM-DD" strings so they can be stored in JSON / SQLite.
export const dkey = (d = new Date()) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

export const isDateKey = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  return dkey(new Date(y, m - 1, d + n));
}
