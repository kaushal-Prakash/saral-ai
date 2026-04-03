// --- 0. Domain Blacklist (Optional but recommended) ---
const blacklistedDomains = ['google.com', 'search.brave.com', 'bing.com', 'duckduckgo.com'];
const isBlacklisted = blacklistedDomains.some(domain => window.location.hostname.includes(domain));

if (!isBlacklisted) {

let isFocusModeOn = false;

// Initial load check
chrome.storage.local.get(["focusModeEnabled"], (result) => {
  if (result.focusModeEnabled) {
    isFocusModeOn = true;
    activateReaderMode();
  }
});

// --- 1. Cognitive Load Score (CLS) Engine ---
// UPDATED: Now returns an object with details so we can make smart decisions
function calculateCLS() {
  const domElementCount = document.getElementsByTagName("*").length;
  let visualDensityScore = Math.min((domElementCount / 1500) * 40, 40);

  const distractions = document.querySelectorAll('iframe, aside, .ad, [id*="ad-"], [class*="popup"], [style*="position: fixed"]').length;
  let distractionScore = Math.min(distractions * 5, 30);

  const paragraphs = document.querySelectorAll("p");
  let textScore = 0;
  if (paragraphs.length > 0) {
    let totalWords = 0;
    let totalSentences = 0;
    paragraphs.forEach((p) => {
      const text = p.innerText;
      totalWords += text.split(/\s+/).length;
      totalSentences += text.split(/[.!?]+/).length;
    });
    const avgSentenceLength = totalSentences > 0 ? totalWords / totalSentences : 0;
    textScore = Math.min((avgSentenceLength / 20) * 30, 30);
  }

  const finalScore = Math.round(visualDensityScore + distractionScore + textScore);
  
  return {
      total: Math.min(finalScore, 100),
      textComplexity: textScore,
      distractions: distractionScore
  };
}

// --- 2. Master Toggle ---
function toggleFocusMode() {
  isFocusModeOn = !isFocusModeOn;
  chrome.storage.local.set({ focusModeEnabled: isFocusModeOn }, () => {
    if (isFocusModeOn) {
      activateReaderMode();
    } else {
      deactivateReaderMode();
    }
  });
}

// --- 3. The Reader Mode Overlay Architecture ---
function activateReaderMode() {
  if (document.getElementById("saral-dynamic-text") && document.getElementById("saral-dynamic-text").innerHTML.includes("Saral AI Reader")) {
      return; 
  }

  const paragraphs = Array.from(document.querySelectorAll("p, article"));
  const combinedText = paragraphs.map(p => p.innerText).join("\n").trim().substring(0, 3000);

  if (combinedText.length < 50) {
    createOrUpdateOverlay(`
        <h2 style="color: #ea4335;">Not enough text found</h2>
        <p>Saral AI couldn't find enough article text on this page to simplify.</p>
    `);
    return;
  }

  let totalWords = combinedText.split(/\s+/).length;
  let totalSentences = combinedText.split(/[.!?]+/).length;
  let avgSentenceLength = totalSentences > 0 ? totalWords / totalSentences : 0;
  const needsAI = avgSentenceLength > 12;

  // --- NEW: Decide if we need Aggressive Simplification based on CLS ---
  const currentCLS = calculateCLS();
  // If text is super complex OR there are tons of ads, be aggressive
  const needsAggressiveSimplification = currentCLS.textComplexity > 25 || currentCLS.distractions > 20;

  let statusMessage = needsAI 
      ? (needsAggressiveSimplification ? "⚠️ High Overload Detected. Saral AI is aggressively summarizing..." : "✨ Saral AI is analyzing and simplifying complex text...") 
      : "✅ Text is already simple. Applying visual accessibility themes...";

  createOrUpdateOverlay(`
        <div style="text-align: center; margin-top: 50px;">
            <h2 style="color: #4285f4;">${statusMessage}</h2>
        </div>
  `);

  chrome.storage.local.get(["saralTheme"], (result) => {
    const currentTheme = result.saralTheme || "default";
    applyThemeToOverlay(currentTheme);
  });

  document.body.style.overflow = "hidden";

  if (!needsAI) {
      setTimeout(() => {
          createOrUpdateOverlay(`
              <h1 style="margin-bottom: 30px;">🧠 Saral AI Reader</h1>
              <div style="line-height: 1.8;">
                  <p><small><i>(API Bypassed: The original text is already written at an accessible reading level.)</i></small></p>
                  ${combinedText.replace(/\n/g, "<br><br>")}
              </div>
          `);
      }, 800);
      return; 
  }

  // --- NEW: Pass the 'aggressive' flag to the background script ---
  chrome.runtime.sendMessage(
    { 
        action: "fetchSimplify", 
        text: combinedText,
        aggressive: needsAggressiveSimplification 
    },
    (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        createOrUpdateOverlay(`
            <h2 style="color: #ea4335;">❌ Connection Error</h2>
            <p>Make sure your local Node.js server is running.</p>
            <small>${chrome.runtime.lastError?.message || response?.error}</small>
        `);
        return;
      }

      createOrUpdateOverlay(`
          <h1 style="margin-bottom: 30px;">🧠 Saral AI Reader</h1>
          <div style="line-height: 1.8;">
              ${response.data.simplifiedText.replace(/\n/g, "<br><br>")}
          </div>
      `);
    }
  );
}

function deactivateReaderMode() {
  const overlay = document.getElementById("saral-reader-overlay");
  if (overlay) overlay.remove();
  document.body.style.overflow = "";
}

function createOrUpdateOverlay(contentHtml) {
  let overlay = document.getElementById("saral-reader-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "saral-reader-overlay";
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background-color: #fdfdfd; z-index: 2147483647; overflow-y: auto;
        font-family: '"Comic Sans MS", Arial, sans-serif'; font-size: 20px;
        transition: background-color 0.3s ease;
    `;

    const container = document.createElement("div");
    container.id = "saral-reader-content";
    container.style.cssText = `
        position: relative; 
        max-width: 800px; margin: 60px auto; padding: 40px;
        background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        color: #333; transition: all 0.3s ease;
    `;

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.title = "Dismiss overlay for this page";
    closeBtn.style.cssText = `
        position: absolute; top: 15px; right: 20px;
        background: none; border: none; font-size: 36px; color: #aaa;
        cursor: pointer; line-height: 1; padding: 0; transition: color 0.2s ease;
    `;

    closeBtn.onmouseover = () => (closeBtn.style.color = "#ea4335");
    closeBtn.onmouseout = () => (closeBtn.style.color = "#aaa");

    closeBtn.addEventListener("click", () => {
      deactivateReaderMode(); 
    });

    const textContent = document.createElement("div");
    textContent.id = "saral-dynamic-text";

    container.appendChild(closeBtn);
    container.appendChild(textContent);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }

  const textContainer = document.getElementById("saral-dynamic-text");
  if (textContainer) {
      textContainer.innerHTML = contentHtml;
  }
}

// --- 4. Theme Handling ---
const themeStyles = {
  default: { background: "#fdfdfd", containerBg: "#ffffff", color: "#333333", fontFamily: "Arial, sans-serif", lineHeight: "1.6", letterSpacing: "normal" },
  adhd: { background: "#121212", containerBg: "#1e1e1e", color: "#e0e0e0", fontFamily: "Verdana, sans-serif", lineHeight: "1.8", letterSpacing: "0.05em" },
  autism: { background: "#f4f0ec", containerBg: "#faf8f5", color: "#4a4a4a", fontFamily: "Arial, sans-serif", lineHeight: "1.6", letterSpacing: "normal" },
  dyslexia: { background: "#fdf8e3", containerBg: "#ffffff", color: "#222222", fontFamily: '"Comic Sans MS", "OpenDyslexic", sans-serif', lineHeight: "2.0", letterSpacing: "0.15em" }
};

function applyThemeToOverlay(themeName) {
  const overlay = document.getElementById("saral-reader-overlay");
  const container = document.getElementById("saral-reader-content");

  if (!overlay || !container) return;
  const style = themeStyles[themeName] || themeStyles["default"];

  overlay.style.backgroundColor = style.background;
  container.style.backgroundColor = style.containerBg;
  container.style.color = style.color;
  container.style.fontFamily = style.fontFamily;
  container.style.lineHeight = style.lineHeight;
  container.style.letterSpacing = style.letterSpacing;
}

// --- 5. Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCLS") {
    // UPDATED: Return the total score for the popup UI
    sendResponse({ score: calculateCLS().total });
  } else if (request.action === "toggleFocusMode") {
    toggleFocusMode();
    sendResponse({ status: "done" });
  } else if (request.action === "changeTheme") {
    applyThemeToOverlay(request.theme); 
    sendResponse({ status: "theme updated" });
  }
});

// Proactive CLS check on page load
setTimeout(() => {
    if (!isFocusModeOn) { 
        const currentScore = calculateCLS().total; // UPDATED to use .total
        if (currentScore > 75) {
            const prompt = document.createElement('div');
            prompt.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 2147483646;
                background: #ea4335; color: white; padding: 15px 20px;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                font-family: Arial, sans-serif; cursor: pointer;
            `;
            prompt.innerHTML = `<strong>🧠 High Cognitive Load (${currentScore})</strong><br>Click here to simplify this page.`;
            
            prompt.addEventListener('click', () => {
                toggleFocusMode();
                prompt.remove();
            });
            
            document.body.appendChild(prompt);
            setTimeout(() => prompt.remove(), 10000);
        }
    }
}, 2000); 

} // End of Blacklist check