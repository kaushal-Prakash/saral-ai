let isFocusModeOn = false;

chrome.storage.local.get(['focusModeEnabled'], (result) => {
    if (result.focusModeEnabled) {
        isFocusModeOn = true;
        activateReaderMode();
    }
});

// --- 1. Cognitive Load Score (CLS) Engine (Unchanged) ---
function calculateCLS() {
    const domElementCount = document.getElementsByTagName('*').length;
    let visualDensityScore = Math.min((domElementCount / 1500) * 40, 40); 

    const distractions = document.querySelectorAll('iframe, aside, .ad, [id*="ad-"], [class*="popup"], [style*="position: fixed"]').length;
    let distractionScore = Math.min((distractions * 5), 30); 

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
        textScore = Math.min((avgSentenceLength / 20) * 30, 30); 
    }

    const finalScore = Math.round(visualDensityScore + distractionScore + textScore);
    return Math.min(finalScore, 100);
}

// --- 2. Master Toggle ---
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

// --- 3. The Reader Mode Overlay Architecture ---
function activateReaderMode() {
    // 1. Create the overlay UI immediately
    createOrUpdateOverlay(`
        <div style="text-align: center; margin-top: 50px;">
            <h2 style="color: #4285f4;">✨ Saral AI is analyzing this page...</h2>
            <p style="color: #666;">Simplifying text and reducing cognitive load.</p>
        </div>
    `);

    // 2. Prevent underlying page from scrolling
    document.body.style.overflow = 'hidden';

    // 3. Extract text and send to AI
    const paragraphs = Array.from(document.querySelectorAll('p, article'));
    const combinedText = paragraphs.map(p => p.innerText).join('\n').trim().substring(0, 3000); // Limit size for API

    if (combinedText.length < 50) {
        createOrUpdateOverlay(`
            <h2 style="color: #ea4335;">Not enough text found</h2>
            <p>Saral AI couldn't find enough article text on this page to simplify.</p>
        `);
        return;
    }

    // 4. Fetch from Backend
    chrome.runtime.sendMessage(
        { action: 'fetchSimplify', text: combinedText },
        (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
                createOrUpdateOverlay(`
                    <h2 style="color: #ea4335;">❌ Connection Error</h2>
                    <p>Make sure your local Node.js server is running.</p>
                    <small>${chrome.runtime.lastError?.message || response?.error}</small>
                `);
                return;
            }

            // 5. Update Overlay with actual AI response
            createOrUpdateOverlay(`
                <h1 style="color: #222; margin-bottom: 30px;">🧠 Saral AI Reader</h1>
                <div style="line-height: 1.8;">
                    ${response.data.simplifiedText.replace(/\n/g, '<br><br>')}
                </div>
            `);
        }
    );
}

function deactivateReaderMode() {
    const overlay = document.getElementById('saral-reader-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = ''; // Restore original website scrolling
}

// Helper function to build the distraction-free UI with a Close Button
function createOrUpdateOverlay(contentHtml) {
    let overlay = document.getElementById('saral-reader-overlay');
    
    // If the overlay doesn't exist yet, build the skeleton (Container + Close Button)
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'saral-reader-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #fdfdfd; z-index: 2147483647; overflow-y: auto;
            font-family: '"Comic Sans MS", Arial, sans-serif'; font-size: 20px;
        `;
        
        // Inner container for spacing
        const container = document.createElement('div');
        container.id = 'saral-reader-content';
        container.style.cssText = `
            position: relative; /* Important for absolute positioning of the X */
            max-width: 800px; margin: 60px auto; padding: 40px;
            background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            color: #333;
        `;

        // --- THE NEW CLOSE BUTTON ---
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;'; // HTML entity for the 'X' symbol
        closeBtn.title = "Close Saral Reader and return to original page"; // The Tooltip
        closeBtn.style.cssText = `
            position: absolute; top: 15px; right: 20px;
            background: none; border: none; font-size: 36px; color: #aaa;
            cursor: pointer; line-height: 1; padding: 0; transition: color 0.2s ease;
        `;
        
        // Hover effects for good UX
        closeBtn.onmouseover = () => closeBtn.style.color = '#ea4335'; // Turns Google Red on hover
        closeBtn.onmouseout = () => closeBtn.style.color = '#aaa';

        // Close action: Destroy overlay and sync extension state
        closeBtn.addEventListener('click', () => {
            isFocusModeOn = false; // Update local variable
            chrome.storage.local.set({ focusModeEnabled: false }); // Update storage so popup stays in sync
            deactivateReaderMode(); // Remove the UI
        });

        // Div to hold the actual AI text so we don't overwrite the close button
        const textContent = document.createElement('div');
        textContent.id = 'saral-dynamic-text';

        // Assemble the DOM
        container.appendChild(closeBtn);
        container.appendChild(textContent);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    // Insert the newly generated HTML into the text container (leaving the Close button untouched)
    document.getElementById('saral-dynamic-text').innerHTML = contentHtml;
}

// --- 4. Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCLS') {
        sendResponse({ score: calculateCLS() });
    } else if (request.action === 'toggleFocusMode') {
        toggleFocusMode();
        sendResponse({ status: 'done' });
    }
});