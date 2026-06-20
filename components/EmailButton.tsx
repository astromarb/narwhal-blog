"use client";
import { useState } from "react";

const EMAIL = "marvlopezacevedo@gmail.com";

export default function EmailButton() {
  const [copied, setCopied] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  }

  return (
    <a href={`mailto:${EMAIL}`} onClick={handleClick}>
      {copied ? "copied!" : "Email"}
    </a>
  );
}
