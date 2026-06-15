"use client";

import { useState } from "react";

export default function PostActions() {
  const [shareLabel, setShareLabel] = useState("share ↗");

  async function handleShare() {
    const url = window.location.href;
    const title = document.title;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title });
      } catch {
        // user dismissed — no-op
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareLabel("copied!");
        setTimeout(() => setShareLabel("share ↗"), 2200);
      } catch {}
    }
  }

  const btnStyle: React.CSSProperties = {
    fontFamily: "var(--f-mono)",
    fontSize: 11,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    background: "none",
    border: "1.5px solid color-mix(in oklab, var(--ink) 30%, transparent)",
    color: "var(--ink-2)",
    padding: "5px 14px",
    cursor: "pointer",
    display: "inline-block",
  };

  return (
    <div className="post-actions no-print" style={{ display: "flex", gap: 10, marginTop: 40, marginBottom: 8 }}>
      <button type="button" style={btnStyle} onClick={() => window.print()}>
        save as pdf ↓
      </button>
      <button type="button" style={btnStyle} onClick={handleShare}>
        {shareLabel}
      </button>
    </div>
  );
}
