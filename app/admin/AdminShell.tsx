"use client";

import { useEffect, useRef, useState } from "react";
const FILL_VARIANTS = ["fill", "fill2", "fill3"] as const;
const CHIP_COLORS: Record<string, string> = { fill: "#dc2626", fill2: "#facc15", fill3: "#60a5fa" };
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
  | { name: "error"; message: string }
  | { name: "site-editor" };

const SESSION_KEY = "admin_pw";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_CATEGORIES = ["field notes", "papers I'm reading", "code and ai", "misc"];

export default function AdminShell() {
  const [phase, setPhase] = useState<Phase>({ name: "locked" });
  const [pw, setPw] = useState("");
  const [siteCategories, setSiteCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [lastBuildUrl, setLastBuildUrl] = useState<string>(() => {
    if (typeof localStorage !== "undefined") return localStorage.getItem("last_build_url") ?? "";
    return "";
  });

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
      const [postsRes, siteRes] = await Promise.all([
        fetch("/api/admin/posts", { headers: { Authorization: `Bearer ${password}` } }),
        fetch("/api/admin/site",  { headers: { Authorization: `Bearer ${password}` } }),
      ]);
      if (postsRes.status === 401) { lockOut("Session expired — please log in again."); return; }
      const data = await postsRes.json() as { ok: boolean; posts?: PostMeta[]; error?: string };
      if (!data.ok) {
        setPhase({ name: "dashboard", posts: [], loading: false, error: data.error });
        return;
      }
      if (siteRes.ok) {
        const siteData = await siteRes.json() as { ok: boolean; config?: { categories?: string[] } };
        if (siteData.ok && siteData.config?.categories?.length) {
          setSiteCategories(siteData.config.categories);
        }
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
    if (data.url) {
      setLastBuildUrl(data.url);
      try { localStorage.setItem("last_build_url", data.url); } catch {}
    }
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
        buildUrl={lastBuildUrl}
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
        onSiteSettings={() => setPhase({ name: "site-editor" })}
      />
    );
  }

  if (phase.name === "site-editor") {
    return <SiteEditor onBack={() => loadDashboard()} />;
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
        categories={siteCategories}
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
        <div style={{ display: "inline-block", background: "var(--a3)", color: "#fff", fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 700, padding: "4px 12px", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 24 }}>
          Administrator Dashboard Login.
        </div>
        <h1
          style={{
            fontFamily: "var(--f-display)",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-.03em",
            margin: "0 0 8px",
            textDecoration: "underline",
          }}
        >
          Sign in.
        </h1>
        <p style={{ fontFamily: "var(--f-hand)", fontSize: 17, color: "var(--ink-2)", margin: "0 0 28px" }}>
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
            style={{ fontSize: 12 }}
          />
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 20, width: "100%", fontSize: 12 }}>
          unlock →
        </button>
        <a
          href="/"
          style={{ display: "block", textAlign: "center", marginTop: 12, fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--ink-3)", textDecoration: "none", letterSpacing: ".06em" }}
        >
          ↩ back
        </a>
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
  onSiteSettings,
  buildUrl,
}: {
  posts: PostMeta[] | null;
  loading: boolean;
  error?: string;
  onNew: () => void;
  onDrop: () => void;
  onEdit: (slug: string) => void;
  onDelete: (slug: string, title: string) => void;
  onLock: () => void;
  onSiteSettings: () => void;
  buildUrl?: string;
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
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={onSiteSettings}
            className="nav-cta"
            style={{ fontFamily: "var(--f-mono)" }}
          >
            site settings
          </button>
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
              color: "#fff",
              background: "#555",
              border: "none",
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            lock
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ marginBottom: 40 }}>
          <div className="tape" style={{ marginBottom: 16, fontSize: 12 }}>dashboard</div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <p style={{ fontFamily: "var(--f-hand)", fontSize: 20, color: "var(--ink-2)", margin: 0 }}>
              {loading
                ? "loading…"
                : posts
                ? `${posts.length} post${posts.length !== 1 ? "s" : ""} · list reflects last build`
                : ""}
            </p>
            {!loading && posts && (
              <a
                href={buildUrl || "https://github.com/astromarb/narwhal-blog/commits/main"}
                target="_blank"
                rel="noreferrer"
                style={{ fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", border: "1px solid color-mix(in oklab, var(--ink) 25%, transparent)", padding: "4px 10px", textDecoration: "none", flexShrink: 0 }}
              >
                ↗ github build
              </a>
            )}
          </div>
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
                        fontSize: 13,
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
                          fontSize: 13,
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
                          fontSize: 13,
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
  categories,
  onBack,
  onPublish,
}: {
  parsed: ParsedPost;
  filename: string;
  sha?: string;
  categories: string[];
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
                {categories.map((c) => (
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

// ── Site editor ────────────────────────────────────────────────────────────────

type SiteConfigData = {
  siteLabel: string;
  heroNote: string;
  heroWord1: string;
  heroWord2: string;
  tagline: string;
  categories: string[];
  colors: {
    paper: string;
    paper2: string;
    paper3: string;
    ink: string;
    ink2: string;
    ink3: string;
    a1: string;
    a2: string;
    a3: string;
  };
  fontSizes: {
    heroTitle: number;
    tagline: number;
    noteText: number;
  };
};

const COLOR_FIELDS: Array<{ key: keyof SiteConfigData["colors"]; label: string }> = [
  { key: "paper",  label: "Background (paper)" },
  { key: "paper2", label: "Paper 2" },
  { key: "paper3", label: "Paper 3" },
  { key: "ink",    label: "Ink (main text)" },
  { key: "ink2",   label: "Ink 2 (muted)" },
  { key: "ink3",   label: "Ink 3 (subtle)" },
  { key: "a1",     label: "Accent 1 (red)" },
  { key: "a2",     label: "Accent 2 (gold)" },
  { key: "a3",     label: "Accent 3 (blue)" },
];

const DEFAULT_SITE: SiteConfigData = {
  siteLabel: "Blog / Field Journal",
  heroNote: "Welcome.",
  heroWord1: "Field",
  heroWord2: "journal.",
  tagline: "Thoughts and findings on a range of topics I'm interested in.",
  categories: ["field notes", "papers I'm reading", "code and ai", "misc"],
  colors: {
    paper: "#0a0908", paper2: "#1c1a16", paper3: "#252219",
    ink: "#e3ddd4", ink2: "#9a9388", ink3: "#5c5852",
    a1: "#dc2626", a2: "#facc15", a3: "#60a5fa",
  },
  fontSizes: { heroTitle: 118, tagline: 34, noteText: 22 },
};

function SiteEditor({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<SiteConfigData>(DEFAULT_SITE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const password = sessionStorage.getItem(SESSION_KEY) ?? "";
    fetch("/api/admin/site", { headers: { Authorization: `Bearer ${password}` } })
      .then((r) => r.json() as Promise<{ ok: boolean; config?: SiteConfigData; error?: string }>)
      .then((data) => {
        if (data.ok && data.config) setConfig(data.config);
        else if (!data.ok) setError(data.error ?? "Failed to load config.");
        setLoading(false);
      })
      .catch((err) => { setError(String(err)); setLoading(false); });
  }, []);

  const updateText = (key: keyof Omit<SiteConfigData, "colors" | "fontSizes" | "categories">, val: string) =>
    setConfig((c) => ({ ...c, [key]: val }));

  const updateColor = (colorKey: keyof SiteConfigData["colors"], val: string) =>
    setConfig((c) => ({ ...c, colors: { ...c.colors, [colorKey]: val } }));

  const updateFontSize = (key: keyof SiteConfigData["fontSizes"], val: number) =>
    setConfig((c) => ({ ...c, fontSizes: { ...c.fontSizes, [key]: val } }));

  const updateCategory = (i: number, val: string) =>
    setConfig((c) => { const cats = [...c.categories]; cats[i] = val; return { ...c, categories: cats }; });

  const removeCategory = (i: number) =>
    setConfig((c) => ({ ...c, categories: c.categories.filter((_, j) => j !== i) }));

  const addCategory = () =>
    setConfig((c) => ({ ...c, categories: [...c.categories, ""] }));

  async function save() {
    const password = sessionStorage.getItem(SESSION_KEY) ?? "";
    setSaving(true);
    setSavedMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` },
        body: JSON.stringify({ config }),
      });
      if (res.status === 401) { onBack(); return; }
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setSavedMsg("Committed to GitHub — Vercel will deploy in ~30 s.");
      } else {
        setError(data.error ?? "Save failed.");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner message="loading site config…" />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--ink)", color: "var(--paper)", padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.7 }}>
          blog / admin / site settings
        </span>
        <button type="button" onClick={onBack} style={{ fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "color-mix(in oklab, var(--paper) 50%, transparent)", background: "none", border: "none", cursor: "pointer" }}>
          ← dashboard
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ marginBottom: 40 }}>
          <div className="tape" style={{ marginBottom: 16 }}>site settings</div>
          <h1 style={{ fontFamily: "var(--f-display)", fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 0.94, margin: 0 }}>
            Edit <em style={{ color: "var(--a1)", fontStyle: "italic" }}>content.</em>
          </h1>
          <p style={{ fontFamily: "var(--f-hand)", fontSize: 18, color: "var(--ink-2)", marginTop: 12 }}>
            changes commit to github and deploy via vercel automatically.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,380px)", gap: 56, alignItems: "start" }}>
          <div>
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 20, marginTop: 0, borderBottom: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)", paddingBottom: 10 }}>
                Hero copy
              </h2>
              <SiteTextField label="Label / breadcrumb" value={config.siteLabel} onChange={(v) => updateText("siteLabel", v)} />
              <SiteTextField label="Note above title (red subtitle)" value={config.heroNote} onChange={(v) => updateText("heroNote", v)} />
              <SiteTextField label="Hero word 1 (white, large)" value={config.heroWord1} onChange={(v) => updateText("heroWord1", v)} />
              <SiteTextField label="Hero word 2 (red italic, large)" value={config.heroWord2} onChange={(v) => updateText("heroWord2", v)} />
              <SiteTextField label="Tagline" value={config.tagline} onChange={(v) => updateText("tagline", v)} multiline />
            </section>

            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 20, marginTop: 0, borderBottom: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)", paddingBottom: 10 }}>
                Font sizes (px)
              </h2>
              <SiteFontField
                label="Hero title"
                value={config.fontSizes.heroTitle}
                onChange={(v) => updateFontSize("heroTitle", v)}
                previewText={`${config.heroWord1} ${config.heroWord2}`}
                previewFont="var(--f-display)"
                previewColor={config.colors.ink}
              />
              <SiteFontField
                label="Tagline"
                value={config.fontSizes.tagline}
                onChange={(v) => updateFontSize("tagline", v)}
                previewText={config.tagline}
                previewFont="var(--f-hand)"
                previewColor={config.colors.ink2}
              />
              <SiteFontField
                label="Note text (red subtitle)"
                value={config.fontSizes.noteText}
                onChange={(v) => updateFontSize("noteText", v)}
                previewText={config.heroNote || "Welcome."}
                previewFont="var(--f-hand)"
                previewColor={config.colors.a1}
              />
            </section>

            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 20, marginTop: 0, borderBottom: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)", paddingBottom: 10 }}>
                Categories
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {config.categories.map((cat, i) => {
                  const fill = FILL_VARIANTS[i % FILL_VARIANTS.length];
                  const dot = CHIP_COLORS[fill];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: dot, flexShrink: 0, display: "inline-block" }} />
                      <input
                        type="text"
                        value={cat}
                        onChange={(e) => updateCategory(i, e.target.value)}
                        style={{ flex: 1, background: "var(--paper-2)", border: "1.5px solid color-mix(in oklab, var(--ink) 20%, transparent)", color: "var(--ink)", fontFamily: "var(--f-body)", fontSize: 14, padding: "7px 10px", outline: "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeCategory(i)}
                        style={{ background: "none", border: "1px solid color-mix(in oklab, var(--a1) 40%, transparent)", color: "var(--a1)", fontFamily: "var(--f-mono)", fontSize: 11, padding: "5px 10px", cursor: "pointer", flexShrink: 0 }}
                      >
                        remove
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={addCategory}
                style={{ marginTop: 14, background: "none", border: "1.5px dashed color-mix(in oklab, var(--ink) 30%, transparent)", color: "var(--ink-2)", fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: ".06em", padding: "8px 16px", cursor: "pointer", width: "100%", textAlign: "center" }}
              >
                + add category
              </button>
            </section>

            <section>
              <h2 style={{ fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 20, marginTop: 0, borderBottom: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)", paddingBottom: 10 }}>
                Colors
              </h2>
              {COLOR_FIELDS.map(({ key, label }) => (
                <SiteColorField key={key} label={label} value={config.colors[key]} onChange={(v) => updateColor(key, v)} />
              ))}
            </section>

            <div style={{ marginTop: 36 }}>
              {error && <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--a3)", padding: "10px 14px", border: "1.5px solid var(--a3)", marginBottom: 14 }}>{error}</div>}
              {savedMsg && <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "#4ade80", padding: "10px 14px", border: "1.5px solid #4ade80", marginBottom: 14 }}>✓ {savedMsg}</div>}
              <button type="button" onClick={save} disabled={saving} className="btn primary" style={{ width: "100%", fontFamily: "var(--f-mono)" }}>
                {saving ? "saving…" : "save & commit →"}
              </button>
            </div>
          </div>

          <div style={{ position: "sticky", top: 80 }}>
            <h2 style={{ fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 16, marginTop: 0, borderBottom: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)", paddingBottom: 10 }}>
              live preview
            </h2>
            <SitePreview config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteTextField({
  label, value, onChange, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--paper-2)",
    border: "1.5px solid color-mix(in oklab, var(--ink) 20%, transparent)",
    color: "var(--ink)",
    fontFamily: "var(--f-body)",
    fontSize: 14,
    padding: "10px 12px",
    boxSizing: "border-box",
    outline: "none",
  };
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-2)", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      )}
    </div>
  );
}

function SiteColorField({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const [hex, setHex] = useState(value);
  useEffect(() => { setHex(value); }, [value]);

  const handleHex = (raw: string) => {
    setHex(raw);
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <input
        type="color"
        value={value}
        onChange={(e) => { onChange(e.target.value); setHex(e.target.value); }}
        style={{ width: 38, height: 38, border: "1.5px solid color-mix(in oklab, var(--ink) 20%, transparent)", background: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}
      />
      <input
        type="text"
        value={hex}
        onChange={(e) => handleHex(e.target.value)}
        maxLength={7}
        style={{ width: 88, background: "var(--paper-2)", border: "1.5px solid color-mix(in oklab, var(--ink) 20%, transparent)", color: "var(--ink)", fontFamily: "var(--f-mono)", fontSize: 12, padding: "6px 8px", boxSizing: "border-box", outline: "none" }}
      />
      <span style={{ fontFamily: "var(--f-mono)", fontSize: 13, color: "var(--ink-2)" }}>{label}</span>
    </div>
  );
}

function SiteFontField({
  label, value, onChange, previewText, previewFont, previewColor,
}: {
  label: string; value: number; onChange: (v: number) => void;
  previewText?: string; previewFont?: string; previewColor?: string;
}) {
  const displaySize = Math.min(value, 36);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <input
          type="number"
          value={value}
          min={10}
          max={200}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: 76, background: "var(--paper-2)", border: "1.5px solid color-mix(in oklab, var(--ink) 20%, transparent)", color: "var(--ink)", fontFamily: "var(--f-mono)", fontSize: 14, padding: "7px 10px", boxSizing: "border-box", outline: "none", textAlign: "right" }}
        />
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 13, color: "var(--ink-2)", letterSpacing: ".04em" }}>{label}</span>
      </div>
      {previewText && (
        <div style={{
          background: "var(--paper-2)",
          border: "1px solid color-mix(in oklab, var(--ink) 10%, transparent)",
          padding: "10px 14px",
          overflow: "hidden",
          maxHeight: 56,
          lineHeight: 1.1,
        }}>
          <span style={{
            fontFamily: previewFont ?? "var(--f-display)",
            fontSize: displaySize,
            color: previewColor ?? "var(--ink)",
            whiteSpace: "nowrap",
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {previewText}
          </span>
        </div>
      )}
    </div>
  );
}

function SitePreview({ config }: { config: SiteConfigData }) {
  const { colors: c, siteLabel, heroNote, heroWord1, heroWord2, tagline } = config;
  return (
    <div style={{ background: c.paper, border: "1.5px solid color-mix(in oklab, #fff 12%, transparent)", padding: "24px 22px", borderRadius: 3 }}>
      <div style={{ display: "inline-block", background: c.a2, color: "#0f0e0c", fontFamily: "var(--f-mono)", fontSize: 9.5, fontWeight: 700, padding: "3px 10px", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
        {siteLabel}
      </div>
      {heroNote && (
        <div style={{ color: c.a1, fontFamily: "var(--f-hand)", fontSize: 12, marginBottom: 6, fontStyle: "italic", lineHeight: 1.4 }}>
          {heroNote}
        </div>
      )}
      <div style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 38, lineHeight: 1.0, marginBottom: 12 }}>
        <span style={{ color: c.ink }}>{heroWord1} </span>
        <em style={{ color: c.a1, fontStyle: "italic" }}>{heroWord2}</em>
      </div>
      <div style={{ color: c.ink2, fontFamily: "var(--f-hand)", fontSize: 13, lineHeight: 1.45, marginBottom: 18 }}>
        {tagline}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([
          { label: "field notes",        bg: c.a1, fg: "#fff" },
          { label: "papers i'm reading", bg: c.a2, fg: "#0f0e0c" },
          { label: "code and ai",        bg: c.a3, fg: "#fff" },
        ] as const).map(({ label, bg, fg }) => (
          <span key={label} style={{ background: bg, color: fg, fontFamily: "var(--f-mono)", fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
