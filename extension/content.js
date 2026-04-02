let isFocusModeOn = false;

// --- 1. Cognitive Load Score (CLS) Engine ---
function calculateCLS() {
    // Metric 1: Visual Density (Total DOM elements relative to screen size)
    const domElementCount = document.getElementsByTagName('*').length;
    let visualDensityScore = Math.min((domElementCount / 1500) * 40, 40); // Max 40 points

    // Metric 2: Distractions (Ads, iframes, sticky elements)
    const distractions = document.querySelectorAll('iframe, aside, .ad, [id*="ad-"], [class*="popup"], [style*="position: fixed"]').length;
    let distractionScore = Math.min((distractions * 5), 30); // Max 30 points

    // Metric 3: Text Complexity (Average sentence length)
    const paragraphs = document.querySelectorAll('p');
    let textScore = 0;
    if (paragraphs.length > 0) {
        let totalWords = 0;
        let totalSentences = 0;
        paragraphs.forEach(p => {
            const text = p.innerText;
            totalWords += text.split(/\s+/).length;
            totalSentences += text.split(/[.!?]+/).length;
        });
        const avgSentenceLength = totalSentences > 0 ? (totalWords / totalSentences) : 0;
        textScore = Math.min((avgSentenceLength / 20) * 30, 30); // Max 30 points
    }

    // Final CLS out of 100
    const finalScore = Math.round(visualDensityScore + distractionScore + textScore);
    return Math.min(finalScore, 100);
}

// --- 2. Focus Mode (Adaptive UI) ---
function toggleFocusMode() {
    isFocusModeOn = !isFocusModeOn;
    
    // Elements that typically cause cognitive overload
    const selectorsToHide = 'aside, iframe, .ad, [id*="ad"], .sidebar, header, footer, [class*="popup"], [class*="banner"]';
    const elements = document.querySelectorAll(selectorsToHide);

    elements.forEach(el => {
        el.style.display = isFocusModeOn ? 'none' : '';
    });

    if (isFocusModeOn) {
        document.body.style.maxWidth = '800px';
        document.body.style.margin = '0 auto';
        document.body.style.backgroundColor = '#fdfdfd';
        document.body.style.fontFamily = '"Comic Sans MS", Arial, sans-serif'; // Dyslexia friendly
        document.body.style.lineHeight = '1.8';
        document.body.style.fontSize = '18px';
    } else {
        // Reset to original
        document.body.style.maxWidth = '';
        document.body.style.margin = '';
        document.body.style.backgroundColor = '';
        document.body.style.fontFamily = '';
        document.body.style.lineHeight = '';
        document.body.style.fontSize = '';
    }
}

// --- 3. AI Text Simplification ---
async function simplifyMainText() {
    // Grab main content (first 5 paragraphs for the prototype)
    const paragraphs = Array.from(document.querySelectorAll('p')).slice(0, 5);
    const combinedText = paragraphs.map(p => p.innerText).join('\n');

    if (!combinedText || combinedText.trim().length < 20) {
        alert("Saral AI: Not enough text found to simplify.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/simplify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: combinedText })
        });

        const data = await response.json();
        
        if (data.success) {
            displaySimplifiedModal(data.simplifiedText);
        }
    } catch (error) {
        console.error("AI Error:", error);
        alert("Saral AI: Ensure your local Node.js backend is running!");
    }
}

function displaySimplifiedModal(text) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 10%; left: 50%; transform: translateX(-50%);
        width: 80%; max-width: 700px; max-height: 80vh; overflow-y: auto;
        background: white; padding: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.2);
        z-index: 2147483647; font-family: 'Segoe UI', sans-serif; font-size: 20px;
        border-radius: 12px; line-height: 1.8; color: #222; border-top: 6px solid #4285f4;
    `;
    
    modal.innerHTML = `
        <h2 style="margin-top:0; color:#4285f4; font-size:24px;">🧠 Saral AI: Simplified View</h2>
        <p>${text.replace(/\n/g, '<br><br>')}</p>
        <button id="saralCloseBtn" style="margin-top: 20px; padding: 12px 24px; background: #ea4335; color: white; border: none; cursor: pointer; border-radius: 6px; font-weight:bold; font-size: 16px;">Close Reader</button>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('saralCloseBtn').addEventListener('click', () => modal.remove());
}

// --- 4. Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCLS') {
        sendResponse({ score: calculateCLS() });
    } else if (request.action === 'toggleFocusMode') {
        toggleFocusMode();
        sendResponse({ status: 'done' });
    } else if (request.action === 'simplifyText') {
        simplifyMainText().then(() => sendResponse({ status: 'done' }));
        return true; // Keep message channel open for async fetch
    }
});