console.log("✅ Saral AI Content Script loaded");

// Listen for the message from popup.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "focus") {
    enableFocusMode();
  }
});

function enableFocusMode() {
  console.log("🚀 Focus Mode Activated");
  alert("Saral AI Activated!");

  removeDistractions();
  const CLS = calculateCLS();
  console.log("🧠 Cognitive Load Score:", CLS);
  
  showCLS(CLS);
  applyAdaptiveUI(CLS);
}

function removeDistractions() {
  const selectors = [
    "aside", "iframe", "[id*='ad']", "[class*='ad']", 
    "[class*='sponsor']", "[id*='promo']", "[class*='banner']", "[role='dialog']"
  ];

  const elements = document.querySelectorAll(selectors.join(","));
  console.log("🧹 Elements hidden:", elements.length);

  elements.forEach((el) => {
    el.style.setProperty("display", "none", "important");
  });
}

function calculateCLS() {
  const paragraphs = document.querySelectorAll("p");
  let totalWords = 0;
  let totalSentences = 0;

  paragraphs.forEach((p) => {
    const text = p.innerText.trim();
    if (!text) return;
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    totalWords += words;
    totalSentences += sentences;
  });

  const avgSentenceLength = totalSentences > 0 ? totalWords / totalSentences : 0;
  const totalElements = document.querySelectorAll("*").length;
  const popups = document.querySelectorAll("[class*='popup'], [id*='modal'], [role='dialog']").length;

  return Math.round(0.5 * avgSentenceLength + 0.3 * (totalElements / 100) + 0.2 * popups);
}

function showCLS(CLS) {
  const existing = document.getElementById("saral-cls-box");
  if (existing) existing.remove();

  const box = document.createElement("div");
  box.id = "saral-cls-box";
  box.innerText = "Saral AI CLS: " + CLS;
  
  box.style.cssText = "position:fixed; top:10px; right:10px; background:#000; color:#fff; padding:10px; z-index:999999; font-size:14px; border-radius:8px;";

  document.body.appendChild(box);
}

function applyAdaptiveUI(CLS) {
  const body = document.body;

  // Base readability
  body.style.maxWidth = "800px";
  body.style.margin = "auto";
  body.style.padding = "20px";

  if (CLS > 60) {
    body.style.backgroundColor = "#111";
    body.style.color = "#fff";
    body.style.fontSize = "22px";
    body.style.lineHeight = "2";
  } else if (CLS > 30) {
    body.style.backgroundColor = "#f4f4f4";
    body.style.color = "#000";
    body.style.fontSize = "18px";
    body.style.lineHeight = "1.8";
  } else {
    body.style.backgroundColor = "#ffffff";
    body.style.color = "#000";
    body.style.fontSize = "16px";
    body.style.lineHeight = "1.6";
  }
}