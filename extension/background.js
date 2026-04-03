const API_BASE = "http://localhost:3000";

// --- 1. Streaming Port Connection ---
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "saral-stream") return;

  let controller = null;

  port.onDisconnect.addListener(() => {
    if (controller) controller.abort();
  });

  port.onMessage.addListener(async (msg) => {
    if (msg.action !== "fetchStream") return;

    controller = new AbortController();

    try {
      const response = await fetch(`${API_BASE}/api/simplify/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: msg.text,
          aggressive: msg.aggressive,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body from server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // Process complete SSE events separated by a blank line.
        while (true) {
          const eventBreak = sseBuffer.indexOf("\n\n");
          if (eventBreak === -1) break;

          const rawEvent = sseBuffer.slice(0, eventBreak);
          sseBuffer = sseBuffer.slice(eventBreak + 2);

          const lines = rawEvent
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;

            const dataStr = line.replace(/^data:\s*/, "").trim();
            if (!dataStr) continue;

            if (dataStr === "[DONE]") {
              port.postMessage({ done: true });
              return;
            }

            try {
              const data = JSON.parse(dataStr);

              if (data.error) {
                port.postMessage({ error: data.error });
              } else if (data.text) {
                port.postMessage({ chunk: data.text });
              }
            } catch (err) {
              console.error("Error parsing stream chunk:", err);
            }
          }
        }
      }

      port.postMessage({ done: true });
    } catch (error) {
      if (controller?.signal?.aborted) return;

      console.error("Background Fetch Error:", error);
      port.postMessage({
        error: error?.message || "Stream request failed.",
      });
    }
  });
});

// --- 2. Listen for tab updates and calculate CLS in the background ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://") &&
    !tab.url.startsWith("edge://") &&
    !tab.url.startsWith("brave://")
  ) {
    chrome.tabs.sendMessage(tabId, { action: "getCLS" }, (response) => {
      if (!chrome.runtime.lastError && response && typeof response.score === "number") {
        const score = response.score;

        chrome.action.setBadgeText({
          text: score.toString(),
          tabId,
        });

        let color = "#34a853";
        if (score > 75) color = "#ea4335";
        else if (score > 40) color = "#fbbc04";

        chrome.action.setBadgeBackgroundColor({
          color,
          tabId,
        });
      }
    });
  }
});