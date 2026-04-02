// Request the CLS score when the popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getCLS' }, (response) => {
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

document.getElementById('focusBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleFocusMode' });
    });
});

document.getElementById('simplifyBtn').addEventListener('click', () => {
    document.getElementById('simplifyBtn').innerText = "Processing...";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'simplifyText' }, () => {
            document.getElementById('simplifyBtn').innerText = "Simplify Text with AI";
        });
    });
});