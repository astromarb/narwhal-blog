"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "@/components/SearchProvider";

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

import { CATEGORY_CHIP, CATEGORY_COLOR } from "@/lib/categories";

type PreviewState = {
  post: PostListItem;
  x: number;
  y: number;
  sigil: string;
};

type ConstellationPoint = {
  slug: string;
  x: number;
  y: number;
};

type ConstellationState = {
  width: number;
  height: number;
  source: { x: number; y: number };
  targets: ConstellationPoint[];
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

function isFinePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function clampPreview(e: PointerEvent<HTMLElement>) {
  const width = 286;
  const height = 172;
  return {
    x: Math.min(e.clientX + 18, window.innerWidth - width - 16),
    y: Math.min(e.clientY + 18, window.innerHeight - height - 16),
  };
}

function getSigil(category?: string) {
  const c = (category ?? "").toLowerCase();
  if (c.includes("geo")) return "field-scrap__sigil--strata";
  if (c.includes("artificial") || c.includes("technology")) return "field-scrap__sigil--circuit";
  if (c.includes("art")) return "field-scrap__sigil--spark";
  if (c.includes("society")) return "field-scrap__sigil--nodes";
  return "field-scrap__sigil--dot";
}

function makeConstellationPath(source: { x: number; y: number }, target: ConstellationPoint) {
  const bend = Math.max(72, Math.abs(target.x - source.x) * 0.28);
  const midY = source.y + (target.y - source.y) * 0.5;
  return `M ${source.x} ${source.y} C ${source.x - bend} ${midY}, ${target.x - bend} ${midY}, ${target.x} ${target.y}`;
}

export default function WritingFilter({
  posts,
  categories,
  categoryCounts,
  initialCategory,
}: Props) {
  const { query } = useSearch();
  const [activeCategory, setActiveCategory] = useState<string | null>(
    initialCategory ?? null
  );
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [constellation, setConstellation] = useState<ConstellationState | null>(null);
  const writingMainRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rowRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const activeCategoryColor = activeCategory ? CATEGORY_COLOR[activeCategory] : undefined;

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

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      if (!activeCategory) {
        setConstellation(null);
        return;
      }
      if (!isFinePointer()) {
        setConstellation(null);
        return;
      }

      const wrap = writingMainRef.current;
      const chip = chipRefs.current[activeCategory];
      if (!wrap || !chip) return;

      const wrapRect = wrap.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      const targets = filtered
        .map((post) => {
          const row = rowRefs.current[post.slug];
          if (!row) return null;
          const rowRect = row.getBoundingClientRect();
          return {
            slug: post.slug,
            x: rowRect.left - wrapRect.left + 18,
            y: rowRect.top - wrapRect.top + rowRect.height * 0.5,
          };
        })
        .filter(Boolean) as ConstellationPoint[];

      setConstellation({
        width: wrap.offsetWidth,
        height: wrap.offsetHeight,
        source: {
          x: chipRect.left - wrapRect.left + chipRect.width * 0.5,
          y: chipRect.top - wrapRect.top + chipRect.height * 0.5,
        },
        targets,
      });
    };

    frame = requestAnimationFrame(measure);
    if (activeCategory) window.addEventListener("resize", measure);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [activeCategory, filtered]);

  function showPreview(post: PostListItem, e: PointerEvent<HTMLElement>) {
    if (!isFinePointer()) return;
    const pos = clampPreview(e);
    setPreview({ post, ...pos, sigil: getSigil(post.category) });
  }

  function movePreview(e: PointerEvent<HTMLElement>) {
    if (!preview || !isFinePointer()) return;
    const pos = clampPreview(e);
    setPreview((current) => current ? { ...current, ...pos } : null);
  }

  return (
    <section
      className="blog-writing"
      id="archive"
      aria-label="Blog archive"
    >
      <div className="writing-main" ref={writingMainRef}>
        {constellation && constellation.targets.length > 0 && (
          <svg
            className="archive-constellation"
            width={constellation.width}
            height={constellation.height}
            viewBox={`0 0 ${constellation.width} ${constellation.height}`}
            style={{ "--constellation-color": activeCategoryColor } as CSSProperties}
            aria-hidden="true"
          >
            {constellation.targets.map((target) => (
              <path
                key={target.slug}
                className="archive-constellation__line"
                d={makeConstellationPath(constellation.source, target)}
                pathLength={1}
              />
            ))}
            <circle
              className="archive-constellation__source"
              cx={constellation.source.x}
              cy={constellation.source.y}
              r={3.2}
            />
            {constellation.targets.map((target) => (
              <circle
                key={`${target.slug}-dot`}
                className="archive-constellation__dot"
                cx={target.x}
                cy={target.y}
                r={2.8}
              />
            ))}
          </svg>
        )}

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
                ref={(el) => {
                  chipRefs.current[c] = el;
                }}
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
                ref={(el) => {
                  rowRefs.current[p.slug] = el;
                }}
                className="post-row"
                href={`/${p.slug}`}
                onPointerEnter={(e) => showPreview(p, e)}
                onPointerMove={movePreview}
                onPointerLeave={() => setPreview(null)}
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
        {query.trim().length > 0 && (
          <p className="search-match-hint">
            {filtered.length} match{filtered.length === 1 ? "" : "es"} for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
      {preview && (
        <aside
          className="field-scrap"
          style={{ "--scrap-x": `${preview.x}px`, "--scrap-y": `${preview.y}px` } as CSSProperties}
          aria-hidden="true"
        >
          <span className={`field-scrap__sigil ${preview.sigil}`} />
          <span className="field-scrap__meta">
            {preview.post.category ?? "uncategorized"} / {preview.post.readingTime ?? "field note"}
          </span>
          <strong>{preview.post.title}</strong>
          {preview.post.excerpt && <p>{preview.post.excerpt}</p>}
        </aside>
      )}
    </section>
  );
}
