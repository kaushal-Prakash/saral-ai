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
