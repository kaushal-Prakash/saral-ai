document.getElementById("focusBtn").addEventListener("click", async () => {
  // 1. Find the active tab in the current window
  const [tab] = await chrome.tabs.query({ 
    active: true, 
    currentWindow: true 
  });

  // 2. Make sure a tab was found, then send the message
  if (tab) {
    console.log("Sending message to tab:", tab.id);
    chrome.tabs.sendMessage(tab.id, { action: "focus" });
    
    // Optional: Close the popup automatically after clicking
    window.close(); 
  }
});