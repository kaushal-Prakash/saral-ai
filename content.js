function enableFocusMode() {
  // Remove ads/popups (basic heuristic)
  const elements = document.querySelectorAll("aside, iframe, .ad, .popup");

  elements.forEach(el => el.remove());

  // Increase readability
  document.body.style.lineHeight = "1.8";
  document.body.style.fontSize = "18px";
  document.body.style.maxWidth = "800px";
  document.body.style.margin = "auto";
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "focus") {
    enableFocusMode();
  }
});