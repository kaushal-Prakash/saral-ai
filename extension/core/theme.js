const themeStyles = {
    default: {
      background: "#fdfdfd",
      containerBg: "#ffffff",
      color: "#333333",
      bionicColor: "#000000",
      fontFamily: "Helvetica, Arial, sans-serif",
      fontStyle: "normal",
      lineHeight: "1.7",
      letterSpacing: "normal",
    },
    adhd: {
      background: "#121212",
      containerBg: "#1e1e1e",
      color: "#e0e0e0",
      bionicColor: "#ffffff",
      fontFamily: "Courier, monospace",
      fontStyle: "normal",
      lineHeight: "1.85",
      letterSpacing: "0.04em",
    },
    autism: {
      background: "#f4f0ec",
      containerBg: "#faf8f5",
      color: "#4a4a4a",
      bionicColor: "#222222",
      fontFamily: "Verdana, sans-serif",
      fontStyle: "normal",
      lineHeight: "1.7",
      letterSpacing: "normal",
    },
    dyslexia: {
      background: "#fdf8e3",
      containerBg: "#ffffff",
      color: "#222222",
      bionicColor: "#1a73e8", /* High contrast blue for dyslexia to help anchoring */
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontStyle: "normal",
      lineHeight: "2.0",
      letterSpacing: "0.12em",
    },
  };

  function applyThemeToOverlay(themeName) {
    const overlay = document.getElementById("saral-reader-overlay");
    const container = document.getElementById("saral-reader-content");

    if (!overlay || !container) return;

    const style = themeStyles[themeName] || themeStyles.default;

    overlay.style.backgroundColor = style.background;
    container.style.backgroundColor = style.containerBg;
    container.style.color = style.color;
    container.style.fontFamily = style.fontFamily;
    container.style.fontStyle = style.fontStyle || "normal";
    
    // Set base theme properties as CSS variables to allow adaptive.js to modify them
    container.style.setProperty('--theme-line-height', style.lineHeight);
    container.style.setProperty('--theme-letter-spacing', style.letterSpacing === 'normal' ? '0em' : style.letterSpacing);
    
    // The actual values combine theme base with adaptive deltas
    container.style.lineHeight = "calc(var(--theme-line-height) + var(--adaptive-line-height-delta, 0em))";
    container.style.letterSpacing = "calc(var(--theme-letter-spacing) + var(--adaptive-letter-spacing, 0em))";
    container.style.transition = "font-size 0.5s ease-in-out, line-height 0.5s ease-in-out, letter-spacing 0.5s ease-in-out";
    
    container.style.setProperty('--bionic-color', style.bionicColor);

    const speedSelect = document.getElementById("saral-speed");
    if (speedSelect) {
      speedSelect.style.fontFamily = style.fontFamily;
      speedSelect.style.color = "#000";
    }

    const buttons = container.querySelectorAll(".saral-btn");
    buttons.forEach((btn) => {
      if (themeName === "adhd") {
        btn.style.background = btn.classList.contains("saral-btn-primary")
          ? "#1a73e8"
          : btn.classList.contains("saral-btn-danger")
            ? "#d93025"
            : "#2a2a2a";
        btn.style.color = "#fff";
      } else {
        btn.style.background = btn.classList.contains("saral-btn-primary")
          ? "#1a73e8"
          : btn.classList.contains("saral-btn-danger")
            ? "#d93025"
            : "#e8eaed";
        btn.style.color = btn.classList.contains("saral-btn-primary") || btn.classList.contains("saral-btn-danger")
          ? "#fff"
          : "#1f1f1f";
      }
    });
  }
