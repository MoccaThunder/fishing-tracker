const STORAGE_KEY = "fishing-tracker:anthropic-api-key";

export function getStoredApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredApiKey(key) {
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — key just won't persist
  }
}
