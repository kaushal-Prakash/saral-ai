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

    if (speechState.prepared) {
        applyBionicFormatting();
    }
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
      // GUIDED LEARNING LOGIC: Pause after completion instead of advancing
      if (isGuidedLearningOn) {
        speechState.isPlaying = false;
        setStatus("Waiting... (Press Next)");
        updateSpeechButtons();
        return;
      }
      
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

  function playNextSentence() {
    if (!speechState.prepared || speechState.sentenceSpans.length === 0) return;
    window.speechSynthesis.cancel();
    speechState.isPlaying = true;
    let nextIndex = speechState.currentIndex + 1;
    if (nextIndex >= speechState.sentenceSpans.length) {
      finishReading();
      return;
    }
    speakSentence(nextIndex);
  }

  function playPrevSentence() {
    if (!speechState.prepared || speechState.sentenceSpans.length === 0) return;
    
    if (typeof window.adaptiveEngine !== 'undefined') {
      window.adaptiveEngine.recordReread();
    }

    window.speechSynthesis.cancel();
    speechState.isPlaying = true;
    let prevIndex = speechState.currentIndex - 1;
    if (prevIndex < 0) prevIndex = 0;
    speakSentence(prevIndex);
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

    const prevBtn = document.getElementById("saral-prev-btn");
    const nextBtn = document.getElementById("saral-next-btn");

    if (prevBtn && !prevBtn.dataset.bound) {
      prevBtn.dataset.bound = "true";
      prevBtn.addEventListener("click", playPrevSentence);
    }

    if (nextBtn && !nextBtn.dataset.bound) {
      nextBtn.dataset.bound = "true";
      nextBtn.addEventListener("click", playNextSentence);
    }

    if (speedSelect && !speedSelect.dataset.bound) {
      speedSelect.dataset.bound = "true";
      speedSelect.addEventListener("change", (e) => {
        speechState.rate = Number(e.target.value) || 1;
      });
    }

    if (!window.saralSpeechKeysBound) {
      window.saralSpeechKeysBound = true;
      document.addEventListener("keydown", (e) => {
        if (!isFocusModeOn || !contentReady) return;
        
        if (e.key === "ArrowRight") {
          e.preventDefault();
          playNextSentence();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          playPrevSentence();
        }
      });
    }

    updateSpeechButtons();
  }