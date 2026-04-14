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
    value
      .match(/[^.!?]+[.!?]*\s*/g)
      ?.filter((segment) => segment.trim().length > 0) || [value]
  );
}

function makeTextBionicSafe(text) {
  return escapeHTML(text).replace(/\b([a-zA-Z]+)\b/g, (match) => {
    if (match.length <= 1) return `<b>${match}</b>`;
    const splitIndex = Math.ceil(match.length / 2);
    // Don't use <b> if it messes with speech engine, but speech engine reads textContent!
    return `<b class="saral-bionic">${match.slice(0, splitIndex)}</b>${match.slice(splitIndex)}`;
  });
}

function applyBionicFormatting() {
  if (!speechState || !speechState.sentenceSpans) return;

  speechState.sentenceSpans.forEach((span, index) => {
    // Rely on speechState.sentences array to get the original unformatted sentence!
    const originalText = speechState.sentences[index];
    if (!originalText) return;

    if (isBionicReadingOn) {
      span.innerHTML = makeTextBionicSafe(originalText);
    } else {
      span.innerHTML = escapeHTML(originalText);
    }
  });
}

function applyBoldFormatting() {
  const container = document.getElementById("saral-reader-content");
  if (!container) return;

  if (typeof isBoldAllOn !== "undefined" && isBoldAllOn) {
    container.classList.add("saral-bold-all");
  } else {
    container.classList.remove("saral-bold-all");
  }
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

    .saral-bionic {
      font-weight: bold;
      color: var(--bionic-color, inherit);
    }

    .saral-bold-all,
    .saral-bold-all * {
      font-weight: bold !important;
    }

    #saral-reader-content * {
      /* Research explicitly shows italic decreases reading performance */
      font-style: normal !important;
    }
  `;
  document.head.appendChild(styleTag);
}
