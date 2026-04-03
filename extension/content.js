
// ------------------------------
// Global State
// ------------------------------
var isFocusModeOn = false;
var isBionicReadingOn = false;
var isGuidedLearningOn = false;
var currentTheme = "default";
var currentStreamPort = null;
var streamBuffer = "";
var contentReady = false;

var speechState = {
  prepared: false,
  sentences: [],
  sentenceSpans: [],
  currentIndex: 0,
  isPlaying: false,
  rate: 1,
  utterance: null,
};

// Blacklist
const blacklistedDomains = [
  "google.com",
  "search.brave.com",
  "bing.com",
  "duckduckgo.com",
];

const isBlacklisted = blacklistedDomains.some((domain) =>
  window.location.hostname.includes(domain),
);

if (!isBlacklisted) {
  injectBaseStylesOnce();

  // Initial load check
  chrome.storage.local.get(["focusModeEnabled", "saralTheme", "isBionicReadingOn", "isGuidedLearningOn"], (result) => {
    if (result.saralTheme) currentTheme = result.saralTheme;
    if (result.isBionicReadingOn) isBionicReadingOn = result.isBionicReadingOn;
    if (result.isGuidedLearningOn) isGuidedLearningOn = result.isGuidedLearningOn;

    if (result.focusModeEnabled) {
      isFocusModeOn = true;
      activateReaderMode();
    }
  });

  function extractReadableText() {
    const nodes = Array.from(
      document.querySelectorAll("article, main, h1, h2, h3, p, li"),
    );

    const parts = nodes
      .map((el) => (el.innerText || "").trim())
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join("\n").trim().slice(0, 5000);
    }

    return (document.body?.innerText || "").trim().slice(0, 5000);
  }
  
  // ------------------------------
  // Message Listener
  // ------------------------------
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getCLS") {
      sendResponse({ score: calculateCLS().total });
    } else if (request.action === "toggleFocusMode") {
      toggleFocusMode();
      sendResponse({ status: "done" });
    } else if (request.action === "changeTheme") {
      currentTheme = request.theme || "default";
      applyThemeToOverlay(currentTheme);
      sendResponse({ status: "theme updated" });
    } else if (request.action === "toggleBionic") {
      isBionicReadingOn = request.state;
      applyBionicFormatting();
      sendResponse({ status: "bionic updated" });
    } else if (request.action === "toggleGuidedLearning") {
      isGuidedLearningOn = request.state;
      const prevBtn = document.getElementById("saral-prev-btn");
      const nextBtn = document.getElementById("saral-next-btn");
      if (prevBtn) prevBtn.style.display = isGuidedLearningOn ? "inline-block" : "none";
      if (nextBtn) nextBtn.style.display = isGuidedLearningOn ? "inline-block" : "none";
      sendResponse({ status: "guided updated" });
    }
  });

  // ------------------------------
  // Proactive CLS Check
  // ------------------------------
  setTimeout(() => {
    if (!isFocusModeOn) {
      const currentScore = calculateCLS().total;

      if (currentScore > 75) {
        const prompt = document.createElement("div");
        prompt.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2147483646;
          background: #ea4335;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          font-family: Arial, sans-serif;
          cursor: pointer;
          max-width: 280px;
        `;
        prompt.innerHTML = `<strong>🧠 High Cognitive Load (${currentScore})</strong><br>Click here to simplify this page.`;

        prompt.addEventListener("click", () => {
          toggleFocusMode();
          prompt.remove();
        });

        document.body.appendChild(prompt);
        setTimeout(() => prompt.remove(), 10000);
      }
    }
  }, 2000);
}