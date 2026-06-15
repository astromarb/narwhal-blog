"use client";

import { useMemo, useState } from "react";

export type PostListItem = {
  title: string;
  slug: string;
  date: string;
  excerpt?: string;
  tags?: string[];
  category?: string;
  readingTime?: string;
  /** Pre-built lowercased haystack from server. */
  searchBlob: string;
};

type Props = {
  posts: PostListItem[];
  categories: string[];
  categoryCounts: Record<string, number>;
  initialCategory?: string;
};

/** Visual chip variant per category — keeps colors stable across pages. */
const CATEGORY_CHIP: Record<string, string> = {
  "field notes": "fill",
  "papers I'm reading": "fill2",
  "code and ai": "fill3",
  "misc": "",
};

function formatDate(d: string): string {
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
      .toLowerCase()
      .replace(",", " /");
  } catch {
    return d;
  }
}

/**
 * Loose semantic-ish scoring:
 *  - tokenize the query on whitespace
 *  - require every token to appear in the haystack (AND)
 *  - score by sum of substring matches; weight title hits heaviest
 *  - falls back to no filter when query is empty
 */
function scorePost(post: PostListItem, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const title = post.title.toLowerCase();
  const excerpt = (post.excerpt ?? "").toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (!post.searchBlob.includes(t)) return 0; // AND across tokens
    if (title.includes(t)) score += 5;
    if (excerpt.includes(t)) score += 2;
    score += 1;
  }
  return score;
}

export default function WritingFilter({
  posts,
  categories,
  categoryCounts,
  initialCategory,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(
    initialCategory ?? null
  );

  const totalCount = posts.length;

  const filtered = useMemo(() => {
    const tokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    return posts
      .map((p) => ({ p, score: scorePost(p, tokens) }))
      .filter(({ p, score }) => {
        if (score === 0) return false;
        if (activeCategory && p.category !== activeCategory) return false;
        return true;
      })
      .sort((a, b) => {
        // When user is searching, sort by score; otherwise stay date-sorted.
        if (tokens.length > 0 && a.score !== b.score) return b.score - a.score;
        return a.p.date < b.p.date ? 1 : -1;
      })
      .map(({ p }) => p);
  }, [posts, query, activeCategory]);

  return (
    <section
      className="writing-grid blog-writing"
      id="archive"
      aria-label="Blog archive"
    >
      <aside className="writing-side">
        <div className="filter-search">
          <span className="icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="search title, body, tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search posts"
          />
          <div className="hint">
            {query.trim().length > 0
              ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}`
              : "loose match across title, body, and tags"}
          </div>
        </div>

      </aside>

      <div className="writing-main">
        <div className="archive-chip-bar" role="tablist" aria-label="Filter by category">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === null}
            className={`chip archive-chip${activeCategory === null ? " archive-chip--on" : ""}`}
            onClick={() => setActiveCategory(null)}
          >
            all <span className="archive-chip__count">{totalCount}</span>
          </button>
          {categories.map((c) => {
            const variant = CATEGORY_CHIP[c] ?? "";
            const isOn = activeCategory === c;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={isOn}
                className={`chip ${variant} archive-chip${isOn ? " archive-chip--on" : ""}`}
                onClick={() => setActiveCategory(isOn ? null : c)}
              >
                {c} <span className="archive-chip__count">{categoryCounts[c] ?? 0}</span>
              </button>
            );
          })}
        </div>

        <div className="writing-list">
        {filtered.length === 0 ? (
          <div className="post-empty">
            no posts match those filters yet — try clearing one.
          </div>
        ) : (
          filtered.map((p) => {
            const chipVariant = CATEGORY_CHIP[p.category ?? ""] ?? "";
            return (
              <a
                key={p.slug}
                className="post-row"
                href={`/${p.slug}`}
              >
                <div className="date">{formatDate(p.date)}</div>
                <div>
                  <h3>{p.title}</h3>
                  {p.excerpt && <div className="excerpt">{p.excerpt}</div>}
                  <div className="chip-row">
                    {p.category && (
                      <span className={`chip ${chipVariant}`.trim()}>
                        {p.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="read">
                  {p.readingTime ?? ""}
                  <br />
                  read →
                </div>
              </a>
            );
          })
        )}
        </div>
      </div>
    </section>
  );
}
