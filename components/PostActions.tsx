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

  return (
    <div className="post-actions no-print">
      <button type="button" className="post-actions__button" onClick={() => window.print()}>
        save as pdf ↓
      </button>
      <button type="button" className="post-actions__button" onClick={handleShare}>
        {shareLabel}
      </button>
    </div>
  );
}
