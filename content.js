console.log("Saral AI running");
function enableFocusMode() {
  // Remove ads/popups (basic heuristic)
  const elements = document.querySelectorAll(`
  aside,
  iframe,
  [id*="ad"],
  [class*="ad"],
  [class*="sponsor"],
  [id*="promo"]
`);

  elements.forEach((el) => {
    el.style.display = "none";
  });

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
