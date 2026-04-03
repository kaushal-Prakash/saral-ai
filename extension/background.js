chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchSimplify') {
        fetch('http://localhost:3000/api/simplify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: request.text })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => sendResponse({ success: true, data: data }))
        .catch(error => {
            console.error("Background Fetch Error:", error);
            sendResponse({ success: false, error: error.message });
        });
        
        return true; // Indicates asynchronous response
    }
});

// Listen for tab updates and calculate CLS in the background
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
        chrome.tabs.sendMessage(tabId, { action: "getCLS" }, (response) => {
            if (!chrome.runtime.lastError && response && response.score) {
                const score = response.score;
                
                // Set the badge text to the score
                chrome.action.setBadgeText({ text: score.toString(), tabId: tabId });
                
                // Color code the badge
                let color = "#34a853"; // Green
                if (score > 75) color = "#ea4335"; // Red
                else if (score > 40) color = "#fbbc04"; // Yellow
                
                chrome.action.setBadgeBackgroundColor({ color: color, tabId: tabId });
            }
        });
    }
});