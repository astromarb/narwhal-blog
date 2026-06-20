"use client";

import { useEffect, useRef, useState } from "react";

type FieldMode = "night" | "day";

const STORAGE_KEY = "marvinFieldMode";

function getInitialMode(): FieldMode {
  if (typeof window === "undefined") return "night";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "day" ? "day" : "night";
}

export default function FieldModeToggle() {
  const [mode, setMode] = useState<FieldMode>("night");
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const initial = getInitialMode();
    document.documentElement.dataset.fieldMode = initial;
    const timer = window.setTimeout(() => setMode(initial), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleMode() {
    const next: FieldMode = mode === "night" ? "day" : "night";
    const root = document.documentElement;
    const rect = buttonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 72;
    const y = rect ? rect.top + rect.height / 2 : 32;

    root.style.setProperty("--field-mode-x", `${x}px`);
    root.style.setProperty("--field-mode-y", `${y}px`);
    root.classList.remove("field-mode-transition");
    void root.offsetWidth;
    root.classList.add("field-mode-transition");
    root.dataset.fieldMode = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    setMode(next);

    window.setTimeout(() => {
      root.classList.remove("field-mode-transition");
    }, 760);
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="field-mode-toggle"
      onClick={toggleMode}
      aria-label={`Switch to ${mode === "night" ? "day" : "night"} field mode`}
      aria-pressed={mode === "day"}
    >
      <span className="field-mode-toggle__track" aria-hidden="true">
        <span className="field-mode-toggle__orb" />
      </span>
      <span className="field-mode-toggle__label">{mode === "night" ? "night" : "day"}</span>
    </button>
  );
}
