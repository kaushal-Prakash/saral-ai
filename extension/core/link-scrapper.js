// ============================================================
// Saral AI - Link Scrapper
// Appends a links section at the bottom of the reader overlay
// ============================================================

function truncateLinkUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.length > 22 ? u.pathname.slice(0, 22) + "…" : u.pathname;
    return host + (u.pathname === "/" ? "" : path);
  } catch {
    return url.length > 45 ? url.slice(0, 45) + "…" : url;
  }
}

function getLinkContext(anchor) {
  // Walk up to find the nearest meaningful text container
  const parent = anchor.closest("p, li, td, blockquote, figcaption") ||
                 anchor.parentElement;
  if (!parent) return "";
  
  const text = parent.textContent.trim().replace(/\s+/g, " ");
  const anchorText = anchor.textContent.trim();
  const idx = text.indexOf(anchorText);
  
  if (idx < 0 || text.length <= anchorText.length + 5) return "";
  
  const start = Math.max(0, idx - 25);
  const end = Math.min(text.length, idx + anchorText.length + 50);
  let snippet = text.slice(start, end).trim();
  
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  
  // Don't return a snippet that's basically just the link text itself
  if (snippet.replace(anchorText, "").trim().length < 5) return "";
  return snippet;
}

function scrapePageLinks() {
  const allAnchors = Array.from(document.querySelectorAll("a[href]")).filter(a => {
    // Skip our own extension elements
    if (a.closest("#saral-reader-overlay") || a.closest("#saral-links-panel")) return false;
    
    const href = a.href || "";
    // Skip JS, mailto, tel, fragment-only, and same-page links
    if (!href ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href === window.location.href ||
        (href.startsWith("#") || (new URL(href, window.location.href).pathname === window.location.pathname && href.includes("#")))
    ) return false;
    
    const text = a.textContent.trim();
    if (!text || text.length < 3 || text.length > 120) return false;
    
    return true;
  });

  // Deduplicate by href
  const seen = new Set();
  return allAnchors.filter(a => {
    if (seen.has(a.href)) return false;
    seen.add(a.href);
    return true;
  });
}

function buildLinkCard(anchor) {
  const label = anchor.textContent.trim();
  const context = getLinkContext(anchor);
  const shortUrl = truncateLinkUrl(anchor.href);

  const card = document.createElement("a");
  card.href = anchor.href;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.className = "saral-link-card";
  card.style.cssText = `
    display: block;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    text-decoration: none;
    color: inherit;
    background: #f8fafc;
    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    cursor: pointer;
    margin-bottom: 8px;
  `;
  card.onmouseover = () => {
    card.style.background = "#eff6ff";
    card.style.borderColor = "#93c5fd";
    card.style.boxShadow = "0 2px 8px rgba(59,130,246,0.12)";
  };
  card.onmouseout = () => {
    card.style.background = "#f8fafc";
    card.style.borderColor = "#e2e8f0";
    card.style.boxShadow = "none";
  };

  card.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">
      ${escapeHTML(label)}
    </div>
    ${context ? `<div style="font-size:12px;color:#64748b;line-height:1.4;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHTML(context)}</div>` : ""}
    <div style="font-size:11px;color:#3b82f6;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
      ${escapeHTML(shortUrl)}
    </div>
  `;
  return card;
}

function injectLinksSection() {
  // Only inject inside the reader overlay
  const textRoot = document.getElementById("saral-dynamic-text");
  if (!textRoot) return;

  // Remove any existing links section to avoid duplicates
  const existing = document.getElementById("saral-links-section");
  if (existing) existing.remove();

  const links = scrapePageLinks();
  if (links.length === 0) return;

  const section = document.createElement("div");
  section.id = "saral-links-section";
  section.style.cssText = `
    margin-top: 40px;
    padding-top: 24px;
    border-top: 2px solid #e2e8f0;
  `;

  const heading = document.createElement("h2");
  heading.style.cssText = `
    font-size: 15px;
    font-weight: 600;
    color: #475569;
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  `;
  heading.innerHTML = `🔗 Page Links <span style="font-size:12px;font-weight:400;color:#94a3b8;text-transform:none;">(${Math.min(links.length, 50)} of ${links.length})</span>`;
  section.appendChild(heading);

  const grid = document.createElement("div");
  grid.style.cssText = "display: flex; flex-direction: column;";
  
  links.slice(0, 50).forEach(anchor => {
    grid.appendChild(buildLinkCard(anchor));
  });

  section.appendChild(grid);
  textRoot.appendChild(section);
}

// Expose globally so reader-mode.js can call it after content loads
window.saralInjectLinks = injectLinksSection;
