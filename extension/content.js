// content.js

// ------------------------------
// Helpers
// ------------------------------
function escapeHTML(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPartialHTML(text) {
  return escapeHTML(text)
    .replace(/^\s*-\s+/gm, "• ")
    .replace(/\n/g, "<br>");
}

function formatFinalHTML(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim());

  const nextNonEmptyLine = (startIndex) => {
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i]) return lines[i];
    }
    return "";
  };

  let html = "";
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      continue;
    }

    const bulletMatch = line.match(/^[-•*]\s+(.*)$/);
    if (bulletMatch) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHTML(bulletMatch[1])}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    const next = nextNonEmptyLine(i);
    const looksLikeHeading =
      line.length <= 80 &&
      !/[.!?]$/.test(line) &&
      !line.includes(".") &&
      /[A-Za-z]/.test(line) &&
      (!next || /^[-•*]\s+/.test(next));

    if (looksLikeHeading) {
      html += `<h2 class="saral-section-heading">${escapeHTML(line)}</h2>`;
    } else {
      html += `<p>${escapeHTML(line)}</p>`;
    }
  }

  if (inList) html += "</ul>";

  return html || `<p>${escapeHTML(text)}</p>`;
}

function getSentenceSegments(text) {
  const value = String(text || "").trim();
  if (!value) return [];

  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    return Array.from(segmenter.segment(value))
      .map((item) => item.segment)
      .filter((segment) => segment.trim().length > 0);
  }

  return (
    value.match(/[^.!?]+[.!?]*\s*/g)?.filter((segment) => segment.trim().length > 0) ||
    [value]
  );
}

function injectBaseStylesOnce() {
  if (document.getElementById("saral-ai-style")) return;

  const styleTag = document.createElement("style");
  styleTag.id = "saral-ai-style";
  styleTag.textContent = `
    #saral-reader-overlay {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      overflow-y: auto;
      background: #fdfdfd;
      transition: background-color 0.25s ease;
    }

    #saral-reader-content {
      position: relative;
      max-width: 900px;
      margin: 48px auto;
      padding: 28px 28px 36px;
      border-radius: 18px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
      background: #fff;
      color: #222;
      transition: background-color 0.25s ease, color 0.25s ease;
    }

    #saral-reader-content h1 {
      margin: 0 0 14px 0;
      font-size: 30px;
      line-height: 1.2;
    }

    #saral-reader-content h2,
    #saral-reader-content .saral-section-heading {
      font-size: 22px;
      margin: 22px 0 10px;
      line-height: 1.3;
    }

    #saral-reader-content p {
      margin: 0 0 14px 0;
      font-size: 18px;
      line-height: 1.85;
      white-space: normal;
      word-break: break-word;
    }

    #saral-reader-content ul {
      margin: 0 0 14px 22px;
      padding: 0;
    }

    #saral-reader-content li {
      margin: 0 0 8px 0;
      font-size: 18px;
      line-height: 1.8;
    }

    #saral-reader-content .saral-toolbar {
      position: sticky;
      top: 10px;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin: 10px 0px 16px;
      padding: 12px;
      border-radius: 6px;
      backdrop-filter: blur(15px);
      background: rgba(127, 127, 127, 0.08);
      border-bottom: 1px solid rgba(0,0,0,0.08);
    }

    #saral-reader-content .saral-toolbar-right {
      margin-left: auto;
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    #saral-reader-content .saral-btn {
      appearance: none;
      border: 0;
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      background: #e8eaed;
      color: #1f1f1f;
      transition: transform 0.15s ease, opacity 0.15s ease, background-color 0.15s ease;
    }

    #saral-reader-content .saral-btn:hover {
      transform: translateY(-1px);
    }

    #saral-reader-content .saral-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      transform: none;
    }

    #saral-reader-content .saral-btn-primary {
      background: #1a73e8;
      color: #fff;
    }

    #saral-reader-content .saral-btn-danger {
      background: #d93025;
      color: #fff;
    }

    #saral-reader-content .saral-speed {
      border-radius: 999px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      padding: 8px 10px;
      font-size: 14px;
      background: #fff;
      color: #222;
    }

    #saral-reader-content .saral-status {
      margin: 6px 0 16px;
      font-size: 14px;
      opacity: 0.85;
    }

    #saral-reader-content .saral-generating {
      font-style: italic;
      color: #666;
    }

    #saral-reader-content .saral-close {
      position: absolute;
      top: 12px;
      right: 18px;
      background: transparent;
      border: none;
      font-size: 36px;
      line-height: 1;
      color: #999;
      cursor: pointer;
      padding: 0;
    }

    #saral-reader-content .saral-close:hover {
      color: #ea4335;
    }

    .saral-sentence {
      white-space: pre-wrap;
      border-radius: 4px;
      padding: 1px 0;
      transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
    }

    .saral-sentence.saral-current-sentence {
      background: rgba(26, 115, 232, 0.16);
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.18) inset;
    }
  `;
  document.head.appendChild(styleTag);
}

// ------------------------------
// Blacklist
// ------------------------------
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

  // ------------------------------
  // State
  // ------------------------------
  let isFocusModeOn = false;
  let currentTheme = "default";
  let currentStreamPort = null;
  let streamBuffer = "";
  let contentReady = false;

  const speechState = {
    prepared: false,
    sentences: [],
    sentenceSpans: [],
    currentIndex: 0,
    isPlaying: false,
    rate: 1,
    utterance: null,
  };

  // Initial load check
  chrome.storage.local.get(["focusModeEnabled", "saralTheme"], (result) => {
    if (result.saralTheme) currentTheme = result.saralTheme;

    if (result.focusModeEnabled) {
      isFocusModeOn = true;
      activateReaderMode();
    }
  });

  // ------------------------------
  // CLS Engine
  // ------------------------------
  function calculateCLS() {
    const domElementCount = document.getElementsByTagName("*").length;
    const visualDensityScore = Math.min((domElementCount / 1500) * 40, 40);

    const distractions = document.querySelectorAll(
      'iframe, aside, .ad, [id*="ad-"], [class*="popup"], [style*="position: fixed"]',
    ).length;
    const distractionScore = Math.min(distractions * 5, 30);

    const paragraphs = document.querySelectorAll("p");
    let textScore = 0;

    if (paragraphs.length > 0) {
      let totalWords = 0;
      let totalSentences = 0;

      paragraphs.forEach((p) => {
        const text = p.innerText || "";
        totalWords += text.split(/\s+/).filter(Boolean).length;
        totalSentences += text.split(/[.!?]+/).filter(Boolean).length;
      });

      const avgSentenceLength = totalSentences > 0 ? totalWords / totalSentences : 0;
      textScore = Math.min((avgSentenceLength / 20) * 30, 30);
    }

    const finalScore = Math.round(visualDensityScore + distractionScore + textScore);

    return {
      total: Math.min(finalScore, 100),
      textComplexity: textScore,
      distractions: distractionScore,
    };
  }

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
  // Overlay Shell
  // ------------------------------
  function ensureOverlayShell() {
    let overlay = document.getElementById("saral-reader-overlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "saral-reader-overlay";

      const container = document.createElement("div");
      container.id = "saral-reader-content";

      const closeBtn = document.createElement("button");
      closeBtn.className = "saral-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.title = "Dismiss overlay for this page";
      closeBtn.addEventListener("click", () => {
        deactivateReaderMode();
      });

      const title = document.createElement("h1");
      title.textContent = "🧠 Saral AI Reader";

      const toolbar = document.createElement("div");
      toolbar.className = "saral-toolbar";

      const readBtn = document.createElement("button");
      readBtn.id = "saral-read-btn";
      readBtn.className = "saral-btn saral-btn-primary";
      readBtn.textContent = "Read Aloud";

      const pauseBtn = document.createElement("button");
      pauseBtn.id = "saral-pause-btn";
      pauseBtn.className = "saral-btn";
      pauseBtn.textContent = "Pause";

      const stopBtn = document.createElement("button");
      stopBtn.id = "saral-stop-btn";
      stopBtn.className = "saral-btn saral-btn-danger";
      stopBtn.textContent = "Stop";

      const rightSide = document.createElement("div");
      rightSide.className = "saral-toolbar-right";

      const speedLabel = document.createElement("span");
      speedLabel.textContent = "Speed";

      const speedSelect = document.createElement("select");
      speedSelect.id = "saral-speed";
      speedSelect.className = "saral-speed";

      [
        ["0.75", "0.75x"],
        ["1.0", "1x"],
        ["1.15", "1.15x"],
        ["1.3", "1.3x"],
      ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        if (value === "1.0") option.selected = true;
        speedSelect.appendChild(option);
      });

      rightSide.appendChild(speedLabel);
      rightSide.appendChild(speedSelect);

      toolbar.appendChild(readBtn);
      toolbar.appendChild(pauseBtn);
      toolbar.appendChild(stopBtn);
      toolbar.appendChild(rightSide);

      const status = document.createElement("div");
      status.id = "saral-status";
      status.className = "saral-status";
      status.textContent = "Preparing reader...";

      const textContent = document.createElement("div");
      textContent.id = "saral-dynamic-text";

      container.appendChild(closeBtn);
      container.appendChild(title);
      container.appendChild(toolbar);
      container.appendChild(status);
      container.appendChild(textContent);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      bindSpeechControls();
    }

    return overlay;
  }

  function createOrUpdateOverlay(contentHtml) {
    ensureOverlayShell();
    const textContainer = document.getElementById("saral-dynamic-text");
    if (textContainer) {
      textContainer.innerHTML = contentHtml;
    }
    applyThemeToOverlay(currentTheme);
  }

  function setStatus(message) {
    const status = document.getElementById("saral-status");
    if (status) status.textContent = message;
  }

  function setReaderReady(ready) {
    contentReady = ready;

    const readBtn = document.getElementById("saral-read-btn");
    const pauseBtn = document.getElementById("saral-pause-btn");
    const stopBtn = document.getElementById("saral-stop-btn");

    if (readBtn) readBtn.disabled = !ready;
    if (pauseBtn) pauseBtn.disabled = !ready;
    if (stopBtn) stopBtn.disabled = !ready;
  }

  // ------------------------------
  // Speech + Highlight
  // ------------------------------
  function resetHighlights() {
    const root = document.getElementById("saral-dynamic-text");
    if (!root) return;

    root.querySelectorAll(".saral-current-sentence").forEach((el) => {
      el.classList.remove("saral-current-sentence");
    });
  }

  function highlightSentence(index) {
    const span = speechState.sentenceSpans[index];
    if (!span) return;

    resetHighlights();
    span.classList.add("saral-current-sentence");
    span.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }

  function prepareSpeechContent() {
    const root = document.getElementById("saral-dynamic-text");
    if (!root) return;

    speechState.sentences = [];
    speechState.sentenceSpans = [];
    speechState.currentIndex = 0;
    speechState.prepared = false;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;

        const tag = node.parentElement.tagName;
        if (
          ["SCRIPT", "STYLE", "BUTTON", "SELECT", "OPTION", "INPUT", "TEXTAREA"].includes(tag)
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        return node.textContent.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    let sentenceIndex = 0;

    textNodes.forEach((node) => {
      const original = node.textContent;
      const segments = getSentenceSegments(original);

      if (segments.length === 0) return;

      const fragment = document.createDocumentFragment();

      segments.forEach((segment) => {
        const span = document.createElement("span");
        span.className = "saral-sentence";
        span.dataset.sentenceIndex = String(sentenceIndex++);
        span.textContent = segment;
        fragment.appendChild(span);
        speechState.sentences.push(segment.trim());
      });

      node.parentNode.replaceChild(fragment, node);
    });

    speechState.sentenceSpans = Array.from(root.querySelectorAll(".saral-sentence"));
    speechState.prepared = speechState.sentenceSpans.length > 0;
  }

  function updateSpeechButtons() {
    const readBtn = document.getElementById("saral-read-btn");
    const pauseBtn = document.getElementById("saral-pause-btn");
    const stopBtn = document.getElementById("saral-stop-btn");

    if (readBtn) readBtn.textContent = speechState.isPlaying ? "Reading..." : "Read Aloud";
    if (pauseBtn) pauseBtn.textContent = "Pause";
    if (stopBtn) stopBtn.textContent = "Stop";
  }

  function speakSentence(index) {
    if (!speechState.isPlaying) return;

    if (index >= speechState.sentenceSpans.length) {
      finishReading();
      return;
    }

    speechState.currentIndex = index;
    highlightSentence(index);

    const sentence = speechState.sentences[index] || speechState.sentenceSpans[index]?.textContent?.trim();
    if (!sentence) {
      speakSentence(index + 1);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = speechState.rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      if (!speechState.isPlaying) return;
      speakSentence(index + 1);
    };

    utterance.onerror = () => {
      finishReading();
    };

    speechState.utterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function startReading() {
    const root = document.getElementById("saral-dynamic-text");
    if (!root) return;

    if (!speechState.prepared) {
      prepareSpeechContent();
    }

    if (!speechState.prepared || speechState.sentenceSpans.length === 0) {
      setStatus("No readable text available for speech.");
      return;
    }

    window.speechSynthesis.cancel();
    resetHighlights();

    speechState.isPlaying = true;

    if (speechState.currentIndex >= speechState.sentenceSpans.length) {
      speechState.currentIndex = 0;
    }

    setStatus("Reading aloud...");
    updateSpeechButtons();
    speakSentence(speechState.currentIndex);
  }

  function pauseReading() {
    if (!speechState.isPlaying) return;

    speechState.isPlaying = false;
    window.speechSynthesis.cancel();
    setStatus("Paused.");
    updateSpeechButtons();
  }

  function stopReading() {
    speechState.isPlaying = false;
    speechState.currentIndex = 0;
    window.speechSynthesis.cancel();
    resetHighlights();
    setStatus("Stopped.");
    updateSpeechButtons();
  }

  function finishReading() {
    speechState.isPlaying = false;
    speechState.currentIndex = 0;
    window.speechSynthesis.cancel();
    resetHighlights();
    setStatus("Finished reading.");
    updateSpeechButtons();
  }

  function bindSpeechControls() {
    const readBtn = document.getElementById("saral-read-btn");
    const pauseBtn = document.getElementById("saral-pause-btn");
    const stopBtn = document.getElementById("saral-stop-btn");
    const speedSelect = document.getElementById("saral-speed");

    if (readBtn && !readBtn.dataset.bound) {
      readBtn.dataset.bound = "true";
      readBtn.addEventListener("click", startReading);
    }

    if (pauseBtn && !pauseBtn.dataset.bound) {
      pauseBtn.dataset.bound = "true";
      pauseBtn.addEventListener("click", pauseReading);
    }

    if (stopBtn && !stopBtn.dataset.bound) {
      stopBtn.dataset.bound = "true";
      stopBtn.addEventListener("click", stopReading);
    }

    if (speedSelect && !speedSelect.dataset.bound) {
      speedSelect.dataset.bound = "true";
      speedSelect.addEventListener("change", (e) => {
        speechState.rate = Number(e.target.value) || 1;
      });
    }

    updateSpeechButtons();
  }

  // ------------------------------
  // Main Reader Mode
  // ------------------------------
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

  function activateReaderMode() {
    const existing = document.getElementById("saral-dynamic-text");
    if (existing && existing.innerHTML.includes("Saral AI Reader")) {
      return;
    }

    const combinedText = extractReadableText();

    if (combinedText.length < 50) {
      createOrUpdateOverlay(`
        <h2 style="color: #ea4335;">Not enough text found</h2>
        <p>Saral AI couldn't find enough article text on this page to simplify.</p>
      `);
      setReaderReady(false);
      setStatus("No readable article text found.");
      return;
    }

    const totalWords = combinedText.split(/\s+/).filter(Boolean).length;
    const totalSentences = combinedText.split(/[.!?]+/).filter(Boolean).length;
    const avgSentenceLength = totalSentences > 0 ? totalWords / totalSentences : 0;
    const needsAI = avgSentenceLength > 12;

    const currentCLS = calculateCLS();
    const needsAggressiveSimplification =
      currentCLS.textComplexity > 25 || currentCLS.distractions > 20;

    document.body.style.overflow = "hidden";

    if (!needsAI) {
      setReaderReady(false);
      createOrUpdateOverlay(`
        <h1 style="margin-bottom: 18px;">🧠 Saral AI Reader</h1>
        <div class="saral-generating">
          (API bypassed: the original text is already accessible.)
        </div>
      `);

      setTimeout(() => {
        createOrUpdateOverlay(formatFinalHTML(combinedText));
        prepareSpeechContent();
        setReaderReady(true);
        setStatus("Ready. You can read aloud.");
      }, 200);

      return;
    }

    currentStreamPort = chrome.runtime.connect({ name: "saral-stream" });
    streamBuffer = "";
    setReaderReady(false);

    createOrUpdateOverlay(`
      <h1 style="margin-bottom: 18px;">🧠 Saral AI Reader</h1>
      <div id="saral-stream-output">
        <div id="saral-generating-msg" class="saral-generating">
          ${
            needsAggressiveSimplification
              ? "⚠️ High overload detected. Simplifying aggressively..."
              : "✨ Analyzing and simplifying complex text..."
          }
        </div>
      </div>
    `);

    const outputDiv = document.getElementById("saral-stream-output");

    currentStreamPort.postMessage({
      action: "fetchStream",
      text: combinedText,
      aggressive: needsAggressiveSimplification,
    });

    currentStreamPort.onMessage.addListener((msg) => {
      if (!outputDiv) return;

      if (msg.error) {
        outputDiv.innerHTML = `<span style="color:#ea4335"><strong>❌ Error:</strong> ${escapeHTML(
          msg.error,
        )}</span>`;
        setReaderReady(false);
        setStatus("Stream failed.");
        return;
      }

      if (msg.done) {
        currentStreamPort?.disconnect();
        currentStreamPort = null;

        outputDiv.innerHTML = formatFinalHTML(streamBuffer);
        prepareSpeechContent();
        setReaderReady(true);
        setStatus("Ready. You can read aloud.");
        return;
      }

      if (msg.chunk) {
        const generatingMsg = document.getElementById("saral-generating-msg");
        if (generatingMsg) generatingMsg.remove();

        streamBuffer += msg.chunk;
        outputDiv.innerHTML = formatPartialHTML(streamBuffer);
        setStatus("Simplifying...");
      }
    });
  }

  function deactivateReaderMode() {
    stopReading();

    if (currentStreamPort) {
      try {
        currentStreamPort.disconnect();
      } catch (e) {
        // ignore
      }
      currentStreamPort = null;
    }

    const overlay = document.getElementById("saral-reader-overlay");
    if (overlay) overlay.remove();

    document.body.style.overflow = "";
    setReaderReady(false);
  }

  // ------------------------------
  // Theme Handling
  // ------------------------------
  const themeStyles = {
    default: {
      background: "#fdfdfd",
      containerBg: "#ffffff",
      color: "#333333",
      fontFamily: "Arial, sans-serif",
      lineHeight: "1.7",
      letterSpacing: "normal",
    },
    adhd: {
      background: "#121212",
      containerBg: "#1e1e1e",
      color: "#e0e0e0",
      fontFamily: "Verdana, sans-serif",
      lineHeight: "1.85",
      letterSpacing: "0.04em",
    },
    autism: {
      background: "#f4f0ec",
      containerBg: "#faf8f5",
      color: "#4a4a4a",
      fontFamily: "Arial, sans-serif",
      lineHeight: "1.7",
      letterSpacing: "normal",
    },
    dyslexia: {
      background: "#fdf8e3",
      containerBg: "#ffffff",
      color: "#222222",
      fontFamily: '"Comic Sans MS", "OpenDyslexic", sans-serif',
      lineHeight: "2.0",
      letterSpacing: "0.12em",
    },
  };

  function applyThemeToOverlay(themeName) {
    const overlay = document.getElementById("saral-reader-overlay");
    const container = document.getElementById("saral-reader-content");

    if (!overlay || !container) return;

    const style = themeStyles[themeName] || themeStyles.default;

    overlay.style.backgroundColor = style.background;
    container.style.backgroundColor = style.containerBg;
    container.style.color = style.color;
    container.style.fontFamily = style.fontFamily;
    container.style.lineHeight = style.lineHeight;
    container.style.letterSpacing = style.letterSpacing;

    const speedSelect = document.getElementById("saral-speed");
    if (speedSelect) {
      speedSelect.style.fontFamily = style.fontFamily;
      speedSelect.style.color = "#000";
    }

    const buttons = container.querySelectorAll(".saral-btn");
    buttons.forEach((btn) => {
      if (themeName === "adhd") {
        btn.style.background = btn.classList.contains("saral-btn-primary")
          ? "#1a73e8"
          : btn.classList.contains("saral-btn-danger")
            ? "#d93025"
            : "#2a2a2a";
        btn.style.color = "#fff";
      } else {
        btn.style.background = btn.classList.contains("saral-btn-primary")
          ? "#1a73e8"
          : btn.classList.contains("saral-btn-danger")
            ? "#d93025"
            : "#e8eaed";
        btn.style.color = btn.classList.contains("saral-btn-primary") || btn.classList.contains("saral-btn-danger")
          ? "#fff"
          : "#1f1f1f";
      }
    });
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