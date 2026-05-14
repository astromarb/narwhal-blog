"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import {
  calcReadingTime,
  parseFrontmatter,
  serializePost,
  titleToSlug,
  type ParsedPost,
} from "@/lib/admin-utils";

type Phase =
  | { name: "locked"; error?: string }
  | { name: "unlocked" }
  | { name: "previewing"; parsed: ParsedPost; dragFilename: string }
  | { name: "publishing" }
  | { name: "published"; url: string; filename: string }
  | { name: "error"; message: string };

const SESSION_KEY = "admin_pw";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminShell() {
  const [phase, setPhase] = useState<Phase>({ name: "locked" });
  const [pw, setPw] = useState("");

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      setPhase({ name: "unlocked" });
    }
  }, []);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim()) return;
    sessionStorage.setItem(SESSION_KEY, pw);
    setPhase({ name: "unlocked" });
  }

  function lockOut(error?: string) {
    sessionStorage.removeItem(SESSION_KEY);
    setPw("");
    setPhase({ name: "locked", error: error ?? "Session expired — please log in again." });
  }

  async function publish(
    fields: Partial<ParsedPost["known"]>,
    unknownYaml: string,
    body: string,
    overwriteSha?: string
  ) {
    const password = sessionStorage.getItem(SESSION_KEY) ?? "";
    const slug = fields.slug ?? titleToSlug(fields.title ?? "untitled");
    const filename = `${slug}.md`;
    const content = serializePost(fields, unknownYaml, body);

    setPhase({ name: "publishing" });

    const res = await fetch("/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ filename, content, ...(overwriteSha ? { sha: overwriteSha } : {}) }),
    });

    const data = await res.json() as {
      ok: boolean; url?: string; sha?: string; error?: string;
    };

    if (res.status === 401) {
      lockOut("Wrong password.");
      return;
    }

    if (res.status === 409 && data.sha) {
      const confirmed = window.confirm(
        `A post named "${filename}" already exists.\nOverwrite it?`
      );
      if (confirmed) {
        setPhase({ name: "unlocked" });
        await publish(fields, unknownYaml, body, data.sha);
      } else {
        setPhase({ name: "previewing", parsed: { known: fields, unknownYaml, body }, dragFilename: filename });
      }
      return;
    }

    if (!res.ok || !data.ok) {
      setPhase({ name: "error", message: data.error ?? "Unknown error." });
      return;
    }

    setPhase({ name: "published", url: data.url ?? "", filename });
  }

  if (phase.name === "locked") return <LockScreen pw={pw} setPw={setPw} onSubmit={unlock} error={phase.error} />;
  if (phase.name === "unlocked") return <DropZone onFile={(parsed, filename) => setPhase({ name: "previewing", parsed, dragFilename: filename })} />;
  if (phase.name === "previewing") return (
    <PreviewForm
      parsed={phase.parsed}
      dragFilename={phase.dragFilename}
      onBack={() => setPhase({ name: "unlocked" })}
      onPublish={publish}
    />
  );
  if (phase.name === "publishing") return <Spinner />;
  if (phase.name === "published") return (
    <Published url={phase.url} filename={phase.filename} onReset={() => setPhase({ name: "unlocked" })} />
  );
  if (phase.name === "error") return (
    <ErrorScreen message={phase.message} onReset={() => setPhase({ name: "unlocked" })} />
  );
  return null;
}

// ── Lock screen ────────────────────────────────────────────────────────────────

function LockScreen({
  pw, setPw, onSubmit, error,
}: {
  pw: string;
  setPw: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error?: string;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--paper)" }}>
      <form
        onSubmit={onSubmit}
        style={{
          border: "2px solid var(--ink)",
          padding: "40px 48px",
          maxWidth: 380,
          width: "100%",
          background: "var(--paper)",
        }}
      >
        <div className="tape" style={{ marginBottom: 24 }}>blog / admin</div>
        <h1
          style={{
            fontFamily: "var(--f-display)",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-.03em",
            margin: "0 0 8px",
          }}
        >
          Sign in.
        </h1>
        <p style={{ fontFamily: "var(--f-hand)", fontSize: 20, color: "var(--ink-2)", margin: "0 0 28px" }}>
          password-protected publishing.
        </p>

        {error && (
          <div
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              color: "var(--a3)",
              marginBottom: 16,
              padding: "8px 12px",
              border: "1.5px solid var(--a3)",
            }}
          >
            {error}
          </div>
        )}

        <div className="filter-search" style={{ marginTop: 0 }}>
          <span className="icon" aria-hidden="true">⌕</span>
          <input
            type="password"
            placeholder="admin password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            required
          />
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 20, width: "100%" }}>
          unlock →
        </button>
      </form>
    </div>
  );
}

// ── Drop zone ──────────────────────────────────────────────────────────────────

function DropZone({ onFile }: { onFile: (parsed: ParsedPost, filename: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
    if (!file.name.endsWith(".md")) {
      setErr("Only .md files are accepted.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      onFile(parseFrontmatter(text), file.name);
    };
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "grid",
        placeItems: "center",
        padding: 40,
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="tape" style={{ marginBottom: 16 }}>blog / admin</div>
          <h1
            style={{
              fontFamily: "var(--f-display)",
              fontSize: "clamp(42px, 7vw, 72px)",
              fontWeight: 700,
              letterSpacing: "-.03em",
              lineHeight: 0.94,
              margin: 0,
            }}
          >
            Drop a <em style={{ color: "var(--a1)", fontStyle: "italic" }}>file.</em>
          </h1>
          <p style={{ fontFamily: "var(--f-hand)", fontSize: 22, color: "var(--ink-2)", marginTop: 14 }}>
            drag your obsidian draft here to publish it.
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="wip"
          style={{
            cursor: "pointer",
            border: dragging
              ? "2px solid var(--a1)"
              : "1px dashed var(--ink)",
            background: dragging
              ? "color-mix(in oklab, var(--a1) 6%, var(--paper))"
              : "var(--paper)",
            transition: "all .15s ease",
            padding: "64px 32px",
          }}
        >
          <div className="wip-tag">{dragging ? "— release to import" : "— drag .md here"}</div>
          <p className="wip-text">{dragging ? "let go." : "or click to browse."}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".md"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
          />
        </div>

        {err && (
          <p style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--a3)", marginTop: 12 }}>
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Preview / edit form ────────────────────────────────────────────────────────

function PreviewForm({
  parsed,
  dragFilename,
  onBack,
  onPublish,
}: {
  parsed: ParsedPost;
  dragFilename: string;
  onBack: () => void;
  onPublish: (
    fields: Partial<ParsedPost["known"]>,
    unknownYaml: string,
    body: string
  ) => void;
}) {
  const [title, setTitle] = useState(parsed.known.title ?? "");
  const [slug, setSlug] = useState(
    parsed.known.slug ?? titleToSlug(parsed.known.title ?? dragFilename.replace(/\.md$/, ""))
  );
  const [date, setDate] = useState(parsed.known.date ?? today());
  const [excerpt, setExcerpt] = useState(parsed.known.excerpt ?? "");
  const [category, setCategory] = useState(parsed.known.category ?? "misc");
  const [tags, setTags] = useState((parsed.known.tags ?? []).join(", "));
  const [tape, setTape] = useState(parsed.known.tape ?? "");
  const [body, setBody] = useState(parsed.body);
  const [readingTime, setReadingTime] = useState(parsed.known.readingTime ?? calcReadingTime(parsed.body));

  useEffect(() => { setReadingTime(calcReadingTime(body)); }, [body]);

  function handleTitleBlur() {
    if (!slug) setSlug(titleToSlug(title));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fields: Partial<ParsedPost["known"]> = {
      title,
      slug: slug || titleToSlug(title),
      date,
      excerpt: excerpt || undefined,
      category,
      tags: tags.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean),
      readingTime,
      tape: tape || undefined,
    };
    onPublish(fields, parsed.unknownYaml, body);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--paper)",
    border: "1.5px solid var(--ink)",
    padding: "9px 12px",
    fontFamily: "var(--f-body)",
    fontSize: 15,
    color: "var(--ink)",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--f-mono)",
    fontSize: 10.5,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "var(--ink-2)",
    marginBottom: 6,
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 20 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--ink)",
          color: "var(--paper)",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "color-mix(in oklab, var(--paper) 65%, transparent)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            ← back
          </button>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: ".1em", opacity: 0.6 }}>
            {dragFilename}
          </span>
        </div>
        <button form="publish-form" type="submit" className="nav-cta" style={{ fontFamily: "var(--f-mono)" }}>
          publish →
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ marginBottom: 36 }}>
          <div className="tape" style={{ marginBottom: 16 }}>review &amp; edit</div>
          <h1
            style={{
              fontFamily: "var(--f-display)",
              fontSize: "clamp(36px, 5vw, 58px)",
              fontWeight: 700,
              letterSpacing: "-.03em",
              lineHeight: 0.94,
              margin: 0,
            }}
          >
            {title || <em style={{ color: "var(--ink-3)", fontStyle: "normal" }}>untitled</em>}
          </h1>
        </div>

        <form id="publish-form" onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Slug *</label>
              <input style={inputStyle} value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date *</label>
              <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Category</label>
              <select
                style={{ ...inputStyle, appearance: "none" }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tags (comma-separated)</label>
              <input style={inputStyle} value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tape label</label>
              <input style={inputStyle} placeholder="e.g. field note, off-the-clock" value={tape} onChange={(e) => setTape(e.target.value)} />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Excerpt</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical" }}
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>

          {parsed.unknownYaml && (
            <details style={{ marginBottom: 20 }}>
              <summary
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: 10.5,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                Unknown frontmatter (preserved verbatim)
              </summary>
              <pre
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: 12,
                  background: "var(--paper-2)",
                  border: "1px solid color-mix(in oklab, var(--ink) 20%, transparent)",
                  padding: "12px 16px",
                  overflow: "auto",
                  color: "var(--ink-2)",
                }}
              >
                {parsed.unknownYaml}
              </pre>
            </details>
          )}

          <div style={fieldStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Body</label>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: ".08em" }}>
                {readingTime} read
              </span>
            </div>
            <textarea
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
              rows={20}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Utility states ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--paper)" }}>
      <div style={{ textAlign: "center" }}>
        <div className="tape" style={{ marginBottom: 16 }}>publishing…</div>
        <p style={{ fontFamily: "var(--f-hand)", fontSize: 26, color: "var(--ink-2)" }}>
          committing to github.
        </p>
      </div>
    </div>
  );
}

function Published({ url, filename, onReset }: { url: string; filename: string; onReset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--paper)", padding: 40 }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div className="tape" style={{ marginBottom: 20 }}>published</div>
        <h1
          style={{
            fontFamily: "var(--f-display)",
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 700,
            letterSpacing: "-.03em",
            lineHeight: 0.94,
            margin: "0 0 16px",
          }}
        >
          It&rsquo;s <em style={{ color: "var(--a1)", fontStyle: "italic" }}>live.</em>
        </h1>
        <p style={{ fontFamily: "var(--f-hand)", fontSize: 22, color: "var(--ink-2)", marginBottom: 32 }}>
          vercel is rebuilding now. check back in ~30 seconds.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a className="btn primary" href={url} target="_blank" rel="noreferrer">
            view on github ↗
          </a>
          <a className="btn" href={`/${filename.replace(/\.md$/, "")}`} target="_blank" rel="noreferrer">
            preview post ↗
          </a>
          <button type="button" className="btn" onClick={onReset}>
            drop another
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--paper)", padding: 40 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div className="tape" style={{ marginBottom: 16 }}>error</div>
        <h1
          style={{
            fontFamily: "var(--f-display)",
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: "-.03em",
            margin: "0 0 16px",
          }}
        >
          Something went wrong.
        </h1>
        <pre
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 12,
            color: "var(--a3)",
            background: "var(--paper-2)",
            padding: "12px 16px",
            textAlign: "left",
            marginBottom: 28,
            overflowX: "auto",
          }}
        >
          {message}
        </pre>
        <button type="button" className="btn" onClick={onReset}>
          ← try again
        </button>
      </div>
    </div>
  );
}
