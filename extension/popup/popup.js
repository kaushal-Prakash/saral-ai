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

// --- Toggle Button Sync ---
function updateFocusBtnUI() {
    chrome.storage.local.get(['focusModeEnabled'], (result) => {
        const btn = document.getElementById('focusBtn');
        if (result.focusModeEnabled) {
            btn.innerText = "DISABLE SARAL READER";
            btn.style.background = "#d93025"; 
        } else {
            btn.innerText = "ENABLE SARAL READER";
            btn.style.background = "#1a73e8";
        }
    });
}

// --- Theme Handling ---
const themeSelect = document.getElementById('themeSelect');

// Load saved theme on popup open
chrome.storage.local.get(['saralTheme'], (result) => {
    if (result.saralTheme) {
        themeSelect.value = result.saralTheme;
    }
});

// Listen for dropdown changes
themeSelect.addEventListener('change', (e) => {
    const selectedTheme = e.target.value;
    
    // Save to storage
    chrome.storage.local.set({ saralTheme: selectedTheme }, () => {
        // Tell the active tab to update the overlay UI immediately
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { 
                action: 'changeTheme', 
                theme: selectedTheme 
            });
        });
    });
});

// --- Bionic Handling ---
const bionicSwitch = document.getElementById('bionicSwitch');

chrome.storage.local.get(['isBionicReadingOn'], (result) => {
    if (result.isBionicReadingOn) {
        bionicSwitch.checked = true;
    }
});

bionicSwitch.addEventListener('change', (e) => {
    const isBionic = e.target.checked;
    
    chrome.storage.local.set({ isBionicReadingOn: isBionic }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { 
                action: 'toggleBionic', 
                state: isBionic 
            });
        });
    });
});

// --- Guided Learning Handling ---
const guidedSwitch = document.getElementById('guidedSwitch');

chrome.storage.local.get(['isGuidedLearningOn'], (result) => {
    if (result.isGuidedLearningOn) {
        guidedSwitch.checked = true;
    }
});

guidedSwitch.addEventListener('change', (e) => {
    const isGuided = e.target.checked;
    
    chrome.storage.local.set({ isGuidedLearningOn: isGuided }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { 
                action: 'toggleGuidedLearning', 
                state: isGuided 
            });
        });
    });
});

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