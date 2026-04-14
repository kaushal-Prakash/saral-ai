// Session Manager for Saral Reader
const MAX_SESSIONS = 15;
const sessionUrl = window.location.href.split("#")[0]; // Ignore fragments

let saveTimeout = null;
let currentSessionCache = null;

function cleanupOldSessions(sessions) {
  const keys = Object.keys(sessions);
  if (keys.length <= MAX_SESSIONS) return sessions;

  // Sort by timestamp descending
  const sorted = keys.sort(
    (a, b) => sessions[b].timestamp - sessions[a].timestamp,
  );

  const retained = {};
  for (let i = 0; i < MAX_SESSIONS; i++) {
    retained[sorted[i]] = sessions[sorted[i]];
  }
  return retained;
}

function getSessionState(callback) {
  chrome.storage.local.get(["saral_sessions"], (result) => {
    const sessions = result.saral_sessions || {};
    currentSessionCache = sessions[sessionUrl] || null;
    callback(currentSessionCache);
  });
}

function saveSessionState(updates) {
  // Update local cache immediately
  currentSessionCache = {
    ...(currentSessionCache || {}),
    ...updates,
    timestamp: Date.now(),
  };

  // Debounce storage writes to avoid hitting limits
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    chrome.storage.local.get(["saral_sessions"], (result) => {
      let sessions = result.saral_sessions || {};
      sessions[sessionUrl] = currentSessionCache;

      sessions = cleanupOldSessions(sessions);

      chrome.storage.local.set({ saral_sessions: sessions });
    });
  }, 1000);
}

// Global functions accessible to other content scripts
window.saralGetSessionState = getSessionState;
window.saralGetSessionStateSync = () => currentSessionCache;
window.saralSaveSessionState = saveSessionState;
