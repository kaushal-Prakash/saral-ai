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