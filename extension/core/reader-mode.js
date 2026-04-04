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

    if (typeof window.saralGetSessionState === 'function') {
      window.saralGetSessionState((session) => {
        proceedActivation(session);
      });
    } else {
      proceedActivation(null);
    }
  }

  function proceedActivation(session) {
    if (session && session.text) {
      setReaderReady(false);
      document.body.style.overflow = "hidden";
      streamBuffer = session.text;
      
      createOrUpdateOverlay(`
        <div class="saral-generating">
          (Resumed from previous session)
        </div>
      `);
      
      setTimeout(() => {
        createOrUpdateOverlay(formatFinalHTML(streamBuffer));
        prepareSpeechContent();
        if (typeof window.saralInjectLinks === 'function') window.saralInjectLinks();
        setReaderReady(true);
        setStatus("Ready. Resumed from previous session.");
        
        if (session.scrollPercent && typeof window.saralRestoreScroll === 'function') {
          window.saralRestoreScroll(session.scrollPercent);
        }
      }, 50);
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

    // --- Flesch-Kincaid: score the original text ---
    const fkBefore =
      typeof window.saralReadability !== "undefined"
        ? window.saralReadability.fleschKincaid(combinedText)
        : null;

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
        <div class="saral-generating">
          (API bypassed: the original text is already accessible.)
        </div>
      `);

      setTimeout(() => {
        createOrUpdateOverlay(formatFinalHTML(combinedText));
        
        // Show FK score (no after score — text wasn't changed)
        if (typeof window.saralShowReadingLevel === "function") {
          window.saralShowReadingLevel({ before: fkBefore, after: null });
        }

        streamBuffer = combinedText;
        if (typeof window.saralSaveSessionState === 'function') {
          window.saralSaveSessionState({ text: streamBuffer });
        }
        
        prepareSpeechContent();
        if (typeof window.saralInjectLinks === 'function') window.saralInjectLinks();
        setReaderReady(true);
        setStatus("Ready. You can read aloud.");
      }, 200);

      return;
    }

    currentStreamPort = chrome.runtime.connect({ name: "saral-stream" });
    streamBuffer = "";
    setReaderReady(false);

    // Show original FK grade while streaming
    if (typeof window.saralShowReadingLevel === "function") {
      window.saralShowReadingLevel({ before: fkBefore, after: null });
    }

    createOrUpdateOverlay(`
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

        // Compute FK after simplification and update the badge with before → after
        if (typeof window.saralReadability !== "undefined" &&
            typeof window.saralShowReadingLevel === "function") {
          const fkAfter = window.saralReadability.fleschKincaid(streamBuffer);
          window.saralShowReadingLevel({ before: fkBefore, after: fkAfter });
        }

        if (typeof window.saralSaveSessionState === 'function') {
          window.saralSaveSessionState({ text: streamBuffer });
        }
        prepareSpeechContent();
        if (typeof window.saralInjectLinks === 'function') window.saralInjectLinks();
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

    if (typeof window.adaptiveEngine !== 'undefined') {
      window.adaptiveEngine.reset();
    }

    document.body.style.overflow = "";
    setReaderReady(false);
  }

  window.triggerAggressiveSimplification = function() {
    if (currentStreamPort) {
      try { currentStreamPort.disconnect(); } catch (e) {}
    }
    
    // Hard reset UI for re-fetch
    const combinedText = extractReadableText();
    streamBuffer = "";
    setReaderReady(false);

    createOrUpdateOverlay(`
      <div id="saral-stream-output">
        <div id="saral-generating-msg" class="saral-generating">
          ⚠️ High overload detected by Adaptive Engine. Re-analyzing with aggressive simplification...
        </div>
      </div>
    `);

    currentStreamPort = chrome.runtime.connect({ name: "saral-stream" });
    
    const outputDiv = document.getElementById("saral-stream-output");

    currentStreamPort.postMessage({
      action: "fetchStream",
      text: combinedText,
      aggressive: true,
    });

    currentStreamPort.onMessage.addListener((msg) => {
      if (!outputDiv) return;

      if (msg.error) {
        outputDiv.innerHTML = `<span style="color:#ea4335"><strong>❌ Error:</strong> ${escapeHTML(msg.error)}</span>`;
        setReaderReady(false);
        setStatus("Stream failed.");
        return;
      }

      if (msg.done) {
        currentStreamPort?.disconnect();
        currentStreamPort = null;

        outputDiv.innerHTML = formatFinalHTML(streamBuffer);
        if (typeof window.saralSaveSessionState === 'function') {
          window.saralSaveSessionState({ text: streamBuffer });
        }
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
        setStatus("Simplifying aggressively...");
      }
    });

    // Reset adaptive engine so it gives the user time to read the new text
    if (typeof window.adaptiveEngine !== 'undefined') {
      window.adaptiveEngine.reset();
    }
  };