// Synthetic demo state only; this is not storage for real medical records.
export function readStorage(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(`astropulse:v2:${key}`)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeStorage(key, value) {
  try {
    localStorage.setItem(`astropulse:v2:${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
