console.log("✅ Saral AI loaded");

// ===== MAIN =====
function enableFocusMode() {
  removeDistractions();
  const CLS = calculateCLS();
  showCLS(CLS);
  applyAdaptiveUI(CLS);
  simplifyContent();
}

// ===== DISTRACTION REMOVAL =====
function removeDistractions() {
  const selectors = [
    "aside",
    "iframe",
    ".ad",
    ".ads",
    ".advert",
    "[class*='-ad-']",
    "[class*='_ad_']",
    "[id*='-ad-']",
    "[id*='_ad_']",
    "[class*='banner']",
    "[role='dialog']",
    ".advertisement",
    "[class*='sponsor']"
  ];

  document
    .querySelectorAll(selectors.join(","))
    .forEach((el) => (el.style.display = "none"));
}

// ===== CLS CALCULATION =====
function calculateCLS() {
  const paragraphs = document.querySelectorAll("p");

  let words = 0,
    sentences = 0;

  paragraphs.forEach((p) => {
    const text = p.innerText;
    if (!text) return;

    words += text.split(/\s+/).length;
    sentences += text.split(/[.!?]/).length;
  });

  const avgSentenceLength = words / (sentences || 1);
  const elements = document.querySelectorAll("*").length;
  const popups = document.querySelectorAll("[role='dialog']").length;

  return Math.round(
    0.5 * avgSentenceLength + 0.3 * (elements / 100) + 0.2 * popups,
  );
}

// ===== UI ADAPTATION =====
function applyAdaptiveUI(CLS) {
  const body = document.body;

  // We should not modify the body's max-width, as it crumbles the layout of 99% of web apps!
  // body.style.maxWidth = "800px";
  // body.style.margin = "auto";
  // body.style.padding = "20px";

  if (CLS > 60) {
    body.style.fontSize = "22px";
  } else if (CLS > 30) {
    body.style.fontSize = "18px";
  } else {
    body.style.fontSize = "16px";
  }
}

// ===== SIMPLIFICATION =====
async function simplifyContent() {
  const paragraphs = document.querySelectorAll("p");
  for (const p of paragraphs) {
    const text = p.innerText.trim();
    if (text.length > 50) {
      // Show loading indicator
      const originalHTML = p.innerHTML;
      p.innerHTML = `<span style="color: #8b5cf6; font-size: 0.9em;">✨ Simplifying...</span> ` + originalHTML;
      
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "simplifyText", text: text }, resolve);
        });

        if (response && response.success) {
          p.innerText = "✨ " + response.text;
          p.style.backgroundColor = "rgba(139, 92, 246, 0.1)"; // highlight modified text slightly
          p.style.padding = "10px";
          p.style.borderRadius = "8px";
        } else {
          console.error("AI Simplifier API Failed:", response ? response.error : "No response from background");
          p.innerHTML = originalHTML; // Revert on failure
        }
      } catch (err) {
        console.error("AI Simplifier Error:", err);
        p.innerHTML = originalHTML; // Revert on error
      }
    }
  }
}

// ===== CLS DISPLAY =====
function showCLS(CLS) {
  const box = document.createElement("div");

  box.innerText = `Saral AI • CLS: ${CLS}`;

  Object.assign(box.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: "#000",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    zIndex: "999999",
    fontSize: "14px",
  });

  document.body.appendChild(box);
}

// ===== LISTENER =====
chrome.storage.local.get(["focusMode"], (result) => {
  if (result.focusMode) {
    enableFocusMode();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "focus") {
    enableFocusMode();
  } else if (msg.action === "disable_focus") {
    window.location.reload();
  }
});
