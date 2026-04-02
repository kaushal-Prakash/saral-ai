function applyAdaptiveUI(score) {
    if (score > 50) { // High load detected
        document.body.style.fontSize = "1.2rem";
        document.body.style.lineHeight = "1.8";
        document.body.style.maxWidth = "800px";
        document.body.style.margin = "0 auto";
        document.body.style.backgroundColor = "#f4f4f9";
        
        // Hide distracting elements
        const distractors = document.querySelectorAll('aside, .sidebar, .pop-up');
        distractors.forEach(el => el.style.display = 'none');
    }
}

// Run on load
const currentScore = calculateCLS();
applyAdaptiveUI(currentScore);