document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("focusToggle");

  // Load saved state
  chrome.storage.local.get(["focusMode"], (result) => {
    toggleBtn.checked = !!result.focusMode;
  });

  // Handle toggle changes
  toggleBtn.addEventListener("change", async (e) => {
    const isEnabled = e.target.checked;
    
    // Save state
    await chrome.storage.local.set({ focusMode: isEnabled });

    // Send message to active tab
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (tabs.length > 0 && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: isEnabled ? "focus" : "disable_focus" 
        }).catch(err => console.log("Content script not ready or error:", err));
      }
    } catch (err) {
      console.log("Error querying tabs:", err);
    }
  });
});