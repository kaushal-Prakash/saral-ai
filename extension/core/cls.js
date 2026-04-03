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