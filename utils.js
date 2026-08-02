export const COMPLAINT_THRESHOLD = 3;
export const DEFAULT_LOC = { lat: 35.1917, lng: -0.6355 };

export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function fmtHour(h) {
  if (h == null) return "";
  const hr = Math.floor(h) % 24;
  const min = Math.round((h % 1) * 60);
  return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function computeStatus(ph, now) {
  if (ph.onDuty) return { open: true, kind: "onDuty" };
  const hour = now.getHours() + now.getMinutes() / 60;
  const { open, close } = ph.hours || { open: 8, close: 21 };
  const isOpen = close > 24 ? hour >= open || hour < close - 24 : hour >= open && hour < close;
  return { open: isOpen, kind: isOpen ? "closesAt" : "opensAt", time: isOpen ? close % 24 : open };
}

export function sanitize(str, max = 200) {
  return String(str || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

export function storageGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
