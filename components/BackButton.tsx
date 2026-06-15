"use client";

import { useEffect, useState } from "react";

export default function BackButton() {
  const [href, setHref] = useState("/#archive");

  useEffect(() => {
    try {
      const ref = document.referrer;
      if (ref && new URL(ref).pathname === "/archive") {
        setHref("/archive");
      }
    } catch {}
  }, []);

  return (
    <a className="blog-back" href={href}>
      ← back to archive
    </a>
  );
}
