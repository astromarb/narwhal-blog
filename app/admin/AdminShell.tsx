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

type PostMeta = {
  slug: string;
  title: string;
  date: string;
  category?: string;
  excerpt?: string;
  readingTime?: string;
};

type Phase =
  | { name: "locked"; error?: string }
  | { name: "dashboard"; posts: PostMeta[] | null; loading: boolean; error?: string }
  | { name: "dropping" }
  | { name: "editing"; parsed: ParsedPost; filename: string; sha?: string }
  | { name: "publishing"; message?: string }
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
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDashboard() {
    const password = sessionStorage.getItem(SESSION_KEY) ?? "";
    setPhase({ name: "dashboard", posts: null, loading: true });
    try {
      const res = await fetch("/api/admin/posts", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.status === 401) { lockOut("Session expired — please log in again."); return; }
      const data = await res.json() as { ok: boolean; posts?: PostMeta[]; error?: string };
      if (!data.ok) {
        setPhase({ name: "dashboard", posts: [], loading: false, error: data.error });
        return;
      }
      setPhase({ name: "dashboard", posts: data.posts ?? [], loading: false });
    } catch (err) {
      setPhase({ name: "dashboard", posts: [], loading: false, error: String(err) });
    }
  }

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim()) return;
    sessionStorage.setItem(SESSION_KEY, pw);
    loadDashboard();
  }

  function lockOut(error?: string) {
    sessionStorage.removeItem(SESSION_KEY);
    setPw("");
    setPhase({ name: "locked", error: error ?? "Session expired — please log in again." });
  }

  async function loadPostForEdit(slug: string) {
    const password = sessionStorage.getItem(SESSION_KEY) ?? "";
    setPhase({ name: "publishing", message: "loading post…" });
    try {
      const res = await fetch(`/api/admin/posts/${slug}`, {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.status === 401) { lockOut(); return; }
      const data = await res.json() as {
        ok: boolean; content?: string; sha?: string; filename?: string; error?: string;
      };
      if (!data.ok || !data.content) {
        setPhase({ name: "error", message: data.error ?? "Failed to load post." });
        return;
      }
      const parsed = parseFrontmatter(data.content);
      setPhase({ name: "editing", parsed, filename: data.filename ?? `${slug}.md`, sha: data.sha });
    } catch (err) {
      setPhase({ name: "error", message: String(err) });
    }
  }

  async function deletePost(slug: string, title: string) {
    if (!window.confirm(`Delete "${title}"?\n\nThis cannot be undone.`)) return;
    const password = sessionStorage.getItem(SESSION_KEY) ?? "";
    try {
      const res = await fetch(`/api/admin/posts/${slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.status === 401) { lockOut(); return; }
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) {
        alert(`Delete failed: ${data.error}`);
        return;
      }
      loadDashboard();
    } catch (err) {
      alert(`Delete failed: ${String(err)}`);
    }
  }

  async function publish(
    fields: Partial<ParsedPost["known"]>,
    unknownYaml: string,
    body: string,
    existingSha?: string
  ) {
    const password = sessionStorage.getItem(SESSION_KEY) ?? "";
    const slug =
      titleToSlug(fields.slug || fields.title || "untitled") || "untitled";
    const filename = `${slug}.md`;
    const content = serializePost(fields, unknownYaml, body);

    setPhase({ name: "publishing", message: "committing to github…" });

    const res = await fetch("/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ filename, content, ...(existingSha ? { sha: existingSha } : {}) }),
    });

    const data = await res.json() as {
      ok: boolean; url?: string; sha?: string; error?: string;
    };

    if (res.status === 401) { lockOut("Wrong password."); return; }

    if (res.status === 409 && data.sha) {
      const confirmed = window.confirm(
        `A post named "${filename}" already exists.\nOverwrite it?`
      );
      if (confirmed) {
        await publish(fields, unknownYaml, body, data.sha);
      } else {
        const parsed: ParsedPost = { known: fields, unknownYaml, body };
        setPhase({ name: "editing", parsed, filename });
      }
      return;
    }

    if (!res.ok || !data.ok) {
      setPhase({ name: "error", message: data.error ?? "Unknown error." });
      return;
    }

    setPhase({ name: "published", url: data.url ?? "", filename });
  }

  if (phase.name === "locked") {
    return <LockScreen pw={pw} setPw={setPw} onSubmit={unlock} error={phase.error} />;
  }

  if (phase.name === "dashboard") {
    return (
      <Dashboard
        posts={phase.posts}
        loading={phase.loading}
        error={phase.error}
        onNew={() => {
          const empty: ParsedPost = {
            known: { date: today(), category: "misc" },
            unknownYaml: "",
            body: "",
          };
          setPhase({ name: "editing", parsed: empty, filename: "" });
        }}
        onDrop={() => setPhase({ name: "dropping" })}
        onEdit={loadPostForEdit}
        onDelete={deletePost}
        onLock={lockOut}
      />
    );
  }

  if (phase.name === "dropping") {
    return (
      <DropZone
        onBack={() => loadDashboard()}
        onFile={(parsed, filename) => setPhase({ name: "editing", parsed, filename })}
      />
    );
  }

  if (phase.name === "editing") {
    return (
      <EditorForm
        parsed={phase.parsed}
        filename={phase.filename}
        sha={phase.sha}
        onBack={() => loadDashboard()}
        onPublish={publish}
      />
    );
  }

  if (phase.name === "publishing") {
    return <Spinner message={phase.message} />;
  }

  if (phase.name === "published") {
    return (
      <Published
        url={phase.url}
        filename={phase.filename}
        onReset={() => loadDashboard()}
      />
    );
  }

  if (phase.name === "error") {
    return (
      <ErrorScreen message={phase.message} onReset={() => loadDashboard()} />
    );
  }

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

// ── Dashboard ──────────────────────────────────────────────────────────────────

function Dashboard({
  posts,
  loading,
  error,
  onNew,
  onDrop,
  onEdit,
  onDelete,
  onLock,
}: {
  posts: PostMeta[] | null;
  loading: boolean;
  error?: string;
  onNew: () => void;
  onDrop: () => void;
  onEdit: (slug: string) => void;
  onDelete: (slug: string, title: string) => void;
  onLock: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
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
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 11,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          blog / admin
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={onDrop}
            className="nav-cta"
            style={{ fontFamily: "var(--f-mono)" }}
          >
            drop file
          </button>
          <button
            type="button"
            onClick={onNew}
            className="nav-cta"
            style={{ fontFamily: "var(--f-mono)" }}
          >
            + new post
          </button>
          <button
            type="button"
            onClick={() => onLock()}
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "color-mix(in oklab, var(--paper) 50%, transparent)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            lock
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ marginBottom: 40 }}>
          <div className="tape" style={{ marginBottom: 16 }}>dashboard</div>
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
            All{" "}
            <em style={{ color: "var(--a1)", fontStyle: "italic" }}>posts.</em>
          </h1>
          <p style={{ fontFamily: "var(--f-hand)", fontSize: 20, color: "var(--ink-2)", marginTop: 12 }}>
            {loading
              ? "loading…"
              : posts
              ? `${posts.length} post${posts.length !== 1 ? "s" : ""} · list reflects last build`
              : ""}
          </p>
        </div>

        {error && (
          <div
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              color: "var(--a3)",
              padding: "10px 14px",
              border: "1.5px solid var(--a3)",
              marginBottom: 24,
            }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            style={{
              fontFamily: "var(--f-hand)",
              fontSize: 20,
              color: "var(--ink-2)",
              padding: "32px 0",
            }}
          >
            fetching posts…
          </div>
        )}

        {!loading && posts && posts.length === 0 && (
          <div
            style={{
              fontFamily: "var(--f-hand)",
              fontSize: 20,
              color: "var(--ink-3)",
              padding: "48px 0",
              textAlign: "center",
            }}
          >
            No posts yet — drop a file or write a new one.
          </div>
        )}

        {!loading && posts && posts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {posts.map((post) => (
              <div
                key={post.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "14px 0",
                  borderBottom: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--f-body)",
                      fontSize: 16,
                      fontWeight: 600,
                      marginBottom: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {post.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: 10.5,
                        color: "var(--ink-3)",
                        letterSpacing: ".06em",
                      }}
                    >
                      {post.date}
                    </span>
                    {post.category && (
                      <span
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: 10.5,
                          color: "var(--ink-3)",
                          letterSpacing: ".06em",
                        }}
                      >
                        {post.category}
                      </span>
                    )}
                    {post.readingTime && (
                      <span
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: 10.5,
                          color: "var(--ink-3)",
                          letterSpacing: ".06em",
                        }}
                      >
                        {post.readingTime} read
                      </span>
                    )}
                  </div>
                  {post.excerpt && (
                    <div
                      style={{
                        fontFamily: "var(--f-body)",
                        fontSize: 13,
                        color: "var(--ink-2)",
                        marginTop: 3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {post.excerpt}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => onEdit(post.slug)}
                    className="btn"
                    style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, padding: "6px 14px" }}
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(post.slug, post.title)}
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: 10.5,
                      padding: "6px 14px",
                      background: "none",
                      border: "1.5px solid color-mix(in oklab, var(--a3) 55%, transparent)",
                      color: "var(--a3)",
                      cursor: "pointer",
                      letterSpacing: ".06em",
                    }}
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Drop zone ──────────────────────────────────────────────────────────────────

function DropZone({
  onBack,
  onFile,
}: {
  onBack: () => void;
  onFile: (parsed: ParsedPost, filename: string) => void;
}) {
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
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: 24,
            }}
          >
            ← dashboard
          </button>
        </div>
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
            Drop a{" "}
            <em style={{ color: "var(--a1)", fontStyle: "italic" }}>file.</em>
          </h1>
          <p
            style={{
              fontFamily: "var(--f-hand)",
              fontSize: 22,
              color: "var(--ink-2)",
              marginTop: 14,
            }}
          >
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
          <p
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              color: "var(--a3)",
              marginTop: 12,
            }}
          >
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Editor form (compose / drop / edit) ───────────────────────────────────────

function EditorForm({
  parsed,
  filename,
  sha,
  onBack,
  onPublish,
}: {
  parsed: ParsedPost;
  filename: string;
  sha?: string;
  onBack: () => void;
  onPublish: (
    fields: Partial<ParsedPost["known"]>,
    unknownYaml: string,
    body: string,
    sha?: string
  ) => void;
}) {
  const isEdit = Boolean(sha);
  const isNew = !filename;

  const [title, setTitle] = useState(parsed.known.title ?? "");
  const [slug, setSlug] = useState(
    parsed.known.slug ??
      (parsed.known.title
        ? titleToSlug(parsed.known.title)
        : filename
        ? titleToSlug(filename.replace(/\.md$/, ""))
        : "")
  );
  const [date, setDate] = useState(parsed.known.date ?? today());
  const [excerpt, setExcerpt] = useState(parsed.known.excerpt ?? "");
  const [category, setCategory] = useState(parsed.known.category ?? "misc");
  const [tags, setTags] = useState((parsed.known.tags ?? []).join(", "));
  const [tape, setTape] = useState(parsed.known.tape ?? "");
  const [body, setBody] = useState(parsed.body);
  const [readingTime, setReadingTime] = useState(
    parsed.known.readingTime ?? calcReadingTime(parsed.body)
  );

  useEffect(() => { setReadingTime(calcReadingTime(body)); }, [body]);

  function handleTitleBlur() {
    if (!slug && title) setSlug(titleToSlug(title));
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
    onPublish(fields, parsed.unknownYaml, body, sha);
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

  const modeLabel = isEdit ? "editing" : isNew ? "new post" : "review & edit";

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
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
            ← dashboard
          </button>
          {filename && (
            <span
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                opacity: 0.5,
              }}
            >
              {filename}
            </span>
          )}
        </div>
        <button
          form="publish-form"
          type="submit"
          className="nav-cta"
          style={{ fontFamily: "var(--f-mono)" }}
        >
          {isEdit ? "save →" : "publish →"}
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ marginBottom: 36 }}>
          <div className="tape" style={{ marginBottom: 16 }}>{modeLabel}</div>
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
            {title || (
              <em style={{ color: "var(--ink-3)", fontStyle: "normal" }}>untitled</em>
            )}
          </h1>
        </div>

        <form id="publish-form" onSubmit={submit}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}
          >
            <div style={fieldStyle}>
              <label style={labelStyle}>Title *</label>
              <input
                style={inputStyle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Slug *</label>
              <input
                style={inputStyle}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date *</label>
              <input
                type="date"
                style={inputStyle}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Category</label>
              <select
                style={{ ...inputStyle, appearance: "none" }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tags (comma-separated)</label>
              <input
                style={inputStyle}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tape label</label>
              <input
                style={inputStyle}
                placeholder="e.g. field note, off-the-clock"
                value={tape}
                onChange={(e) => setTape(e.target.value)}
              />
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>Body</label>
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: 10.5,
                  color: "var(--ink-3)",
                  letterSpacing: ".08em",
                }}
              >
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

function Spinner({ message }: { message?: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--paper)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div className="tape" style={{ marginBottom: 16 }}>
          {message ?? "publishing…"}
        </div>
        <p
          style={{
            fontFamily: "var(--f-hand)",
            fontSize: 26,
            color: "var(--ink-2)",
          }}
        >
          {message ?? "committing to github."}
        </p>
      </div>
    </div>
  );
}

function Published({
  url,
  filename,
  onReset,
}: {
  url: string;
  filename: string;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--paper)",
        padding: 40,
      }}
    >
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
          It&rsquo;s{" "}
          <em style={{ color: "var(--a1)", fontStyle: "italic" }}>live.</em>
        </h1>
        <p
          style={{
            fontFamily: "var(--f-hand)",
            fontSize: 22,
            color: "var(--ink-2)",
            marginBottom: 32,
          }}
        >
          vercel is rebuilding now. check back in ~30 seconds.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a className="btn primary" href={url} target="_blank" rel="noreferrer">
            view on github ↗
          </a>
          <a
            className="btn"
            href={`/${filename.replace(/\.md$/, "")}`}
            target="_blank"
            rel="noreferrer"
          >
            preview post ↗
          </a>
          <button type="button" className="btn" onClick={onReset}>
            ← dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--paper)",
        padding: 40,
      }}
    >
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
          ← dashboard
        </button>
      </div>
    </div>
  );
}
