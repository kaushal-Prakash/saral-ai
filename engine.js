function calculateCLS() {
    const images = document.querySelectorAll('img').length;
    const links = document.querySelectorAll('a').length;
    const ads = document.querySelectorAll('.ad, .banner, [id*="ad"]').length;
    const textLength = document.body.innerText.length;

    // Basic heuristic: higher count = higher cognitive load
    let score = (images * 5) + (links * 2) + (ads * 20) + (textLength / 500);
    
    // Normalize score to 1-100
    return Math.min(Math.round(score / 10), 100);
}