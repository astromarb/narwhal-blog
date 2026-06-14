"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print"
      style={{
        fontFamily: "var(--f-mono)",
        fontSize: 11,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        background: "none",
        border: "1.5px solid color-mix(in oklab, var(--ink) 30%, transparent)",
        color: "var(--ink-2)",
        padding: "5px 14px",
        cursor: "pointer",
        marginTop: 16,
        display: "inline-block",
      }}
    >
      save as pdf ↓
    </button>
  );
}
