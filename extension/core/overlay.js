function ensureOverlayShell() {
    let overlay = document.getElementById("saral-reader-overlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "saral-reader-overlay";

      const progressContainer = document.createElement("div");
      progressContainer.id = "saral-progress-container";
      progressContainer.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 5px;
        background: rgba(0,0,0,0.05);
        z-index: 2147483647;
      `;

      const progressBar = document.createElement("div");
      progressBar.id = "saral-progress-bar";
      progressBar.style.cssText = `
        height: 100%;
        width: 0%;
        background: #1a73e8;
        transition: width 0.1s ease-out;
      `;
      progressContainer.appendChild(progressBar);
      overlay.appendChild(progressContainer);

      const container = document.createElement("div");
      container.id = "saral-reader-content";

      const closeBtn = document.createElement("button");
      closeBtn.className = "saral-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.title = "Dismiss overlay for this page";
      closeBtn.addEventListener("click", () => {
        // Use toggleFocusMode so storage is correctly updated to false
        // This ensures the reader doesn't auto-reopen on next page load
        deactivateReaderMode();
        isFocusModeOn = false;
        chrome.storage.local.set({ focusModeEnabled: false });
      });

      const title = document.createElement("h1");
      title.textContent = "🧠 Saral AI Reader";

      const readingLevelBadge = document.createElement("div");
      readingLevelBadge.id = "saral-reading-level";
      readingLevelBadge.style.cssText = `
        display: none;
        font-size: 13px;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: 999px;
        background: rgba(26, 115, 232, 0.1);
        color: #1a73e8;
        margin-bottom: 10px;
        width: fit-content;
        letter-spacing: 0.01em;
      `;

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

      const prevBtn = document.createElement("button");
      prevBtn.id = "saral-prev-btn";
      prevBtn.className = "saral-btn";
      prevBtn.textContent = "Prev (<)";

      const nextBtn = document.createElement("button");
      nextBtn.id = "saral-next-btn";
      nextBtn.className = "saral-btn";
      nextBtn.textContent = "Next (>)";

      prevBtn.style.display = isGuidedLearningOn ? "inline-block" : "none";
      nextBtn.style.display = isGuidedLearningOn ? "inline-block" : "none";

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
      toolbar.appendChild(prevBtn);
      toolbar.appendChild(nextBtn);
      toolbar.appendChild(rightSide);

      const status = document.createElement("div");
      status.id = "saral-status";
      status.className = "saral-status";
      status.textContent = "Preparing reader...";

      const textContent = document.createElement("div");
      textContent.id = "saral-dynamic-text";

      container.appendChild(closeBtn);
      container.appendChild(title);
      container.appendChild(readingLevelBadge);
      container.appendChild(toolbar);
      container.appendChild(status);
      container.appendChild(textContent);
      overlay.appendChild(container);

      //--- Go to Top Button ---
      const goToTopBtn = document.createElement("button");
      goToTopBtn.innerHTML = "↑";
      goToTopBtn.title = "Go to Top";
      goToTopBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: #1a73e8;
        color: white;
        font-size: 24px;
        font-weight: bold;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: none;
        z-index: 2147483647;
        transition: opacity 0.3s ease, transform 0.2s ease;
        opacity: 0;
      `;
      goToTopBtn.onmouseover = () => (goToTopBtn.style.transform = "scale(1.1)");
      goToTopBtn.onmouseout = () => (goToTopBtn.style.transform = "scale(1)");

      goToTopBtn.addEventListener("click", () => {
        overlay.scrollTo({ top: 0, behavior: "smooth" });
      });

      overlay.addEventListener("scroll", () => {
        if (typeof window.adaptiveEngine !== 'undefined') {
          window.adaptiveEngine.handleScroll(overlay);
        }

        const maxScroll = overlay.scrollHeight - overlay.clientHeight;
        const scrollPercent = maxScroll > 0 ? overlay.scrollTop / maxScroll : 0;
        
        const pb = document.getElementById("saral-progress-bar");
        if (pb) pb.style.width = (scrollPercent * 100) + "%";

        if (typeof window.saralSaveSessionState === 'function') {
          window.saralSaveSessionState({ scrollPercent });
        }

        if (overlay.scrollTop > 300) {
          goToTopBtn.style.display = "block";
          setTimeout(() => (goToTopBtn.style.opacity = "1"), 10); // Trigger transition
        } else {
          goToTopBtn.style.opacity = "0";
          setTimeout(() => {
            if (overlay.scrollTop <= 300) goToTopBtn.style.display = "none";
          }, 300); // Wait for transition
        }
      });

      overlay.appendChild(goToTopBtn);
      // -----------------------------

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
    const prevBtn = document.getElementById("saral-prev-btn");
    const nextBtn = document.getElementById("saral-next-btn");

    if (readBtn) readBtn.disabled = !ready;
    if (pauseBtn) pauseBtn.disabled = !ready;
    if (stopBtn) stopBtn.disabled = !ready;
    if (prevBtn) prevBtn.disabled = !ready;
    if (nextBtn) nextBtn.disabled = !ready;
  }

  window.saralRestoreScroll = function(percent) {
    const overlay = document.getElementById("saral-reader-overlay");
    if (!overlay) return;
    
    let attempts = 0;
    const scrollInterval = setInterval(() => {
      const maxScroll = overlay.scrollHeight - overlay.clientHeight;
      if (maxScroll > 0) {
        overlay.scrollTo({ top: maxScroll * percent, behavior: "instant" });
        const pb = document.getElementById("saral-progress-bar");
        if (pb) pb.style.width = (percent * 100) + "%";
      }
      
      attempts++;
      if (attempts >= 4) {
        clearInterval(scrollInterval);
      }
    }, 150);
  }

  /**
   * Updates the reading-level badge in the reader overlay.
   * Called by reader-mode.js once FK scores are computed.
   *
   * @param {{ before: object|null, after: object|null }} scores
   */
  window.saralShowReadingLevel = function ({ before, after }) {
    const badge = document.getElementById("saral-reading-level");
    if (!badge) return;

    const R = window.saralReadability;
    if (!R) return;

    if (before && after) {
      // Full before → after display
      badge.textContent =
        `📖 Reading Level: Grade ${before.grade} (${R.gradeLabel(before.grade)})` +
        ` → Grade ${after.grade} (${R.gradeLabel(after.grade)})`;

      // Color the badge green if we improved by ≥ 1 grade
      if (before.grade - after.grade >= 1) {
        badge.style.background = "rgba(52, 168, 83, 0.12)";
        badge.style.color = "#188038";
      } else {
        badge.style.background = "rgba(26, 115, 232, 0.1)";
        badge.style.color = "#1a73e8";
      }
    } else if (before) {
      // Only original text scored (AI bypassed or streaming).
      badge.textContent =
        `📖 Reading Level: Grade ${before.grade} (${R.gradeLabel(before.grade)})`;
      badge.style.background = "rgba(26, 115, 232, 0.1)";
      badge.style.color = "#1a73e8";
    }

    badge.style.display = "block";
  };