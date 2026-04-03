// --- 1. The Streaming Port Connection ---
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "saral-stream") {
        port.onMessage.addListener(async (msg) => {
            if (msg.action === "fetchStream") {
                try {
                    const response = await fetch('http://localhost:3000/api/simplify/stream', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            text: msg.text,
                            aggressive: msg.aggressive 
                        })
                    });

                    if (!response.body) throw new Error("No response body from server.");

                    // Initialize the stream reader
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder('utf-8');

                    // Continuously read the stream chunks
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break; // Exit loop when stream is finished
                        
                        // Decode the raw bytes into text
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');
                        
                        // Parse the Server-Sent Events (SSE) format
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.replace('data: ', '').trim();
                                
                                if (dataStr === '[DONE]') {
                                    port.postMessage({ done: true });
                                    return;
                                }
                                
                                if (dataStr) {
                                    try {
                                        const data = JSON.parse(dataStr);
                                        if (data.error) {
                                            port.postMessage({ error: data.error });
                                        } else if (data.text) {
                                            // Send the chunk to the frontend!
                                            port.postMessage({ chunk: data.text });
                                        }
                                    } catch (err) {
                                        console.error("Error parsing stream chunk:", err);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Background Fetch Error:", error);
                    port.postMessage({ error: error.message });
                }
            }
        });
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