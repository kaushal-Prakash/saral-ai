class AdaptiveBehaviorEngine {
  constructor() {
    this.csi = 0; // Cognitive Stress Index: 0 (breezy/fast) to 100 (struggling)
    this.lastScrollY = 0;
    this.lastScrollTime = Date.now();
    this.stagnationTimer = null;
    this.promptShown = false;

    // Adjustable UI state bounds
    this.bounds = {
      baseLineHeight: 1.7, // will be driven by theme though
      maxLineHeightDelta: 0.6,
      maxLetterSpacing: 0.1,
      minFontSize: 16,
      maxFontSize: 20
    };
  }

  // Hook this to overlay's scroll event
  handleScroll(overlay) {
    const currentY = overlay.scrollTop;
    const now = Date.now();
    const timeDelta = now - this.lastScrollTime;
    
    // Evaluate scrolling behavior only every 500ms to prevent distracting rapid changes
    if (timeDelta >= 500) {
      const scrollDelta = currentY - this.lastScrollY;
      const velocity = scrollDelta / timeDelta;
      
      if (velocity > 0.5) {
        // Fast reading / skimming -> decrease stress
        this.updateCSI(-5);
      } else if (velocity < -0.2) {
        // Scrolling upwards (re-reading) -> increase stress
        this.updateCSI(10);
      } else if (velocity > 0 && velocity < 0.1) {
        // Very slow read -> slight struggle -> slight increase
        this.updateCSI(2);
      }
      
      this.lastScrollY = currentY;
      this.lastScrollTime = now;
    }

    this.resetStagnationTimer();
  }

  // Hook this to "prev" button or similar interactions
  recordReread() {
    this.updateCSI(25); // Major friction indicator
  }

  resetStagnationTimer() {
    if (this.stagnationTimer) clearTimeout(this.stagnationTimer);
    
    // If user stares at same spot for > 30s, increase stress index
    this.stagnationTimer = setTimeout(() => {
      this.updateCSI(10);
    }, 30000);
  }

  updateCSI(delta) {
    this.csi += delta;
    if (this.csi < 0) this.csi = 0;
    if (this.csi > 100) this.csi = 100;

    this.applyVisualAdjustments();

    if (this.csi >= 85 && !this.promptShown) {
      this.promptAggressiveSimplification();
    }
  }

  applyVisualAdjustments() {
    const container = document.getElementById("saral-reader-content");
    if (!container) return;

    // Map CSI (0 to 100) to visual parameters
    const stressRatio = this.csi / 100;
    
    // Line height increases from 1.0 multiplier to 1.35 multiplier of base theme
    const lhIncrease = stressRatio * this.bounds.maxLineHeightDelta;
    container.style.setProperty("--adaptive-line-height-delta", `${lhIncrease}em`);

    // Letter spacing increases slightly
    const lsIncrease = stressRatio * this.bounds.maxLetterSpacing;
    container.style.setProperty("--adaptive-letter-spacing", `${lsIncrease}em`);

    // Font size slightly increases
    const fontSize = this.bounds.minFontSize + (stressRatio * (this.bounds.maxFontSize - this.bounds.minFontSize));
    container.style.fontSize = `${fontSize}px`;
  }

  promptAggressiveSimplification() {
    this.promptShown = true;
    
    const overlay = document.getElementById("saral-reader-overlay");
    if (!overlay) return;

    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 30px;
      background: #ea4335;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: inherit;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 10px;
      animation: saral-slide-up 0.3s ease-out;
      max-width: 300px;
    `;

    toast.innerHTML = `
      <strong style="margin:0;font-size:16px;">Having Trouble?</strong>
      <span style="font-size:14px;line-height:1.4;">We noticed you might be struggling with the text density.</span>
      <div style="display:flex;gap:10px;margin-top:5px;">
        <button id="saral-b-aggressive" style="background:#fff;color:#ea4335;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-weight:bold;">Simplify More</button>
        <button id="saral-b-dismiss" style="background:transparent;color:#fff;border:1px solid #fff;border-radius:4px;padding:6px 12px;cursor:pointer;">Dismiss</button>
      </div>
    `;

    overlay.appendChild(toast);

    document.getElementById("saral-b-aggressive").addEventListener("click", () => {
      toast.remove();
      if (typeof window.triggerAggressiveSimplification === 'function') {
        window.triggerAggressiveSimplification();
      }
    });

    document.getElementById("saral-b-dismiss").addEventListener("click", () => {
      toast.remove();
      // reset CSI to delay prompt reappearing immediately
      this.csi = 50;
      setTimeout(() => { this.promptShown = false; }, 60000); // remind again in 1 min if still struggling
    });
  }

  reset() {
    this.csi = 0;
    this.promptShown = false;
    this.lastScrollY = 0;
    if (this.stagnationTimer) clearTimeout(this.stagnationTimer);
  }
}

// Global instance 
window.adaptiveEngine = new AdaptiveBehaviorEngine();
