const API_KEY = 'AIzaSyCCnmRW3jp4WlsjmZwgqp325U_M5d2bV7E';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "simplifyText") {
        simplifyWithAI(request.text).then(simplifiedText => {
            sendResponse({ success: true, text: simplifiedText });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        
        return true; // Keeps the message channel open for the async response
    }
});

async function simplifyWithAI(complexText) {
    const prompt = `You are a cognitive accessibility assistant. Rewrite the following text to be extremely simple, clear, and easy to read for someone with cognitive overload or ADHD. Use short sentences and basic vocabulary. Keep the core meaning intact.\n\nText to simplify:\n${complexText}`;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}
