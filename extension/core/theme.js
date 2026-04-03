const themeStyles = {
    default: {
      background: "#fdfdfd",
      containerBg: "#ffffff",
      color: "#333333",
      fontFamily: "Arial, sans-serif",
      lineHeight: "1.7",
      letterSpacing: "normal",
    },
    adhd: {
      background: "#121212",
      containerBg: "#1e1e1e",
      color: "#e0e0e0",
      fontFamily: "Verdana, sans-serif",
      lineHeight: "1.85",
      letterSpacing: "0.04em",
    },
    autism: {
      background: "#f4f0ec",
      containerBg: "#faf8f5",
      color: "#4a4a4a",
      fontFamily: "Arial, sans-serif",
      lineHeight: "1.7",
      letterSpacing: "normal",
    },
    dyslexia: {
      background: "#fdf8e3",
      containerBg: "#ffffff",
      color: "#222222",
      fontFamily: '"Comic Sans MS", "OpenDyslexic", sans-serif',
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
    container.style.lineHeight = style.lineHeight;
    container.style.letterSpacing = style.letterSpacing;

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
