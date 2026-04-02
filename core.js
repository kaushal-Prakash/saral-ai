console.log("✅ Saral AI loaded");

// ===== MAIN =====
function enableFocusMode() {
  removeDistractions();
  const CLS = calculateCLS();
  showCLS(CLS);
  applyAdaptiveUI(CLS);
}

// ===== DISTRACTION REMOVAL =====
function removeDistractions() {
  const selectors = [
    "aside",
    "iframe",
    "[id*='ad']",
    "[class*='ad']",
    "[class*='banner']",
    "[role='dialog']"
  ];

  document.querySelectorAll(selectors.join(","))
    .forEach(el => el.style.display = "none");
}

// ===== CLS CALCULATION =====
function calculateCLS() {
  const paragraphs = document.querySelectorAll("p");

  let words = 0, sentences = 0;

  paragraphs.forEach(p => {
    const text = p.innerText;
    if (!text) return;

    words += text.split(/\s+/).length;
    sentences += text.split(/[.!?]/).length;
  });

  const avgSentenceLength = words / (sentences || 1);
  const elements = document.querySelectorAll("*").length;
  const popups = document.querySelectorAll("[role='dialog']").length;

  return Math.round(
    0.5 * avgSentenceLength +
    0.3 * (elements / 100) +
    0.2 * popups
  );
}

// ===== UI ADAPTATION =====
function applyAdaptiveUI(CLS) {
  const body = document.body;

  body.style.maxWidth = "800px";
  body.style.margin = "auto";
  body.style.padding = "20px";

  if (CLS > 60) {
    body.style.background = "#111";
    body.style.color = "#fff";
    body.style.fontSize = "22px";
  } else if (CLS > 30) {
    body.style.background = "#f5f5f5";
    body.style.fontSize = "18px";
  } else {
    body.style.background = "#fff";
    body.style.fontSize = "16px";
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
    fontSize: "14px"
  });

  document.body.appendChild(box);
}

// ===== LISTENER =====
chrome.storage.local.get(['focusMode'], (result) => {
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