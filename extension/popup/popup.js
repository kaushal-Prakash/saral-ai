// Request the CLS score when the popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getCLS' }, (response) => {
        if (chrome.runtime.lastError) {
            document.getElementById('clsValue').innerText = "--";
            const statusEl = document.getElementById('clsStatus');
            statusEl.innerText = "Cannot analyze this page.";
            statusEl.style.color = "#ea4335";
            return;
        }
        if (response && response.score) {
            updateCLSDisplay(response.score);
        }
    });
});

function updateCLSDisplay(score) {
    document.getElementById('clsValue').innerText = score;
    const statusEl = document.getElementById('clsStatus');
    
    if (score > 75) {
        statusEl.innerText = "High Overload Detected 🔴";
        statusEl.style.color = "#ea4335";
    } else if (score > 40) {
        statusEl.innerText = "Moderate Clutter 🟡";
        statusEl.style.color = "#fbbc04";
    } else {
        statusEl.innerText = "Clean & Accessible 🟢";
        statusEl.style.color = "#34a853";
    }
}

function updateFocusBtnUI() {
    chrome.storage.local.get(['focusModeEnabled'], (result) => {
        const btn = document.getElementById('focusBtn');
        if (result.focusModeEnabled) {
            btn.innerText = "Disable Saral Reader";
            btn.style.background = "#ea4335";
        } else {
            btn.innerText = "Enable Saral Reader (AI)";
            btn.style.background = "#4285f4";
        }
    });
}

// Initial UI sync
updateFocusBtnUI();

document.getElementById('focusBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleFocusMode' }, () => {
            if (chrome.runtime.lastError) return;
            setTimeout(updateFocusBtnUI, 50);
        });
    });
});