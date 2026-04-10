function calculateCLS() {
    const domElementCount = document.getElementsByTagName("*").length;
    const visualDensityScore = Math.min((domElementCount / 5000) * 40, 40);

    const distractions = document.querySelectorAll(
      'iframe:not([src*="youtube.com"]), aside, .ad, [id*="ad-"], [class*="modal"], [class*="overlay"], [class*="popup"]:not([class*="mwe-popups"]), [style*="position: fixed"]',
    ).length;
    const distractionScore = Math.min(distractions * 3, 30);

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
      textScore = Math.min((avgSentenceLength / 25) * 30, 30);
    }

    const finalScore = Math.round(visualDensityScore + distractionScore + textScore);

    return {
      total: Math.min(finalScore, 100),
      textComplexity: textScore,
      distractions: distractionScore,
    };
  }