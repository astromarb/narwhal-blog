"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_CHIP, CATEGORY_COLOR } from "@/lib/categories";
import type { PostListItem } from "@/components/WritingFilter";

type Props = {
  posts: PostListItem[];
  categories: string[];
  categoryCounts: Record<string, number>;
};

type PreviewState = {
  post: PostListItem;
  x: number;
  y: number;
  sigil: string;
};

type Point = {
  slug: string;
  x: number;
  y: number;
};

type ConstellationState = {
  width: number;
  height: number;
  source: { x: number; y: number };
  targets: Point[];
};

function formatDate(d: string): string {
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date
      .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
      .toLowerCase()
      .replace(",", "");
  } catch {
    return d;
  }
}

function getYear(d: string): string {
  try {
    return String(new Date(d).getFullYear());
  } catch {
    return "—";
  }
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

function makeConstellationPath(source: { x: number; y: number }, target: Point) {
  const bend = Math.max(48, Math.abs(target.x - source.x) * 0.24);
  const midY = source.y + (target.y - source.y) * 0.5;
  return `M ${source.x} ${source.y} C ${source.x - bend} ${midY}, ${target.x - bend} ${midY}, ${target.x} ${target.y}`;
}

export default function ArchiveExplorer({ posts, categories, categoryCounts }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [constellation, setConstellation] = useState<ConstellationState | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rowRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const filtered = useMemo(
    () => posts.filter((post) => !activeCategory || post.category === activeCategory),
    [posts, activeCategory]
  );
  const activeCategoryColor = activeCategory ? CATEGORY_COLOR[activeCategory] : undefined;

  const years = useMemo(() => {
    const byYear = new Map<string, typeof filtered>();
    for (const post of filtered) {
      const year = getYear(post.date);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(post);
    }
    return [...byYear.entries()].sort(([a], [b]) => Number(b) - Number(a));
  }, [filtered]);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      if (!activeCategory || !isFinePointer()) {
        setConstellation(null);
        return;
      }

      const shell = shellRef.current;
      const chip = chipRefs.current[activeCategory];
      if (!shell || !chip) return;

      const shellRect = shell.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      const targets = filtered
        .map((post) => {
          const row = rowRefs.current[post.slug];
          if (!row) return null;
          const rowRect = row.getBoundingClientRect();
          return {
            slug: post.slug,
            x: rowRect.left - shellRect.left + 10,
            y: rowRect.top - shellRect.top + rowRect.height * 0.5,
          };
        })
        .filter(Boolean) as Point[];

      setConstellation({
        width: shell.offsetWidth,
        height: shell.offsetHeight,
        source: {
          x: chipRect.left - shellRect.left + chipRect.width * 0.5,
          y: chipRect.top - shellRect.top + chipRect.height * 0.5,
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
    <div className="archive-explorer" ref={shellRef}>
      {constellation && constellation.targets.length > 0 && (
        <svg
          className="archive-constellation archive-constellation--archive"
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
          <circle className="archive-constellation__source" cx={constellation.source.x} cy={constellation.source.y} r={3.2} />
          {constellation.targets.map((target) => (
            <circle key={`${target.slug}-dot`} className="archive-constellation__dot" cx={target.x} cy={target.y} r={2.8} />
          ))}
        </svg>
      )}

      <div className="archive-chip-bar archive-chip-bar--page" role="tablist" aria-label="Filter archive by category">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === null}
          className={`chip archive-chip${activeCategory === null ? " archive-chip--on" : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          all <span className="archive-chip__count">{posts.length}</span>
        </button>
        {categories.map((category) => {
          const variant = CATEGORY_CHIP[category] ?? "";
          const isOn = activeCategory === category;
          return (
            <button
              key={category}
              ref={(el) => {
                chipRefs.current[category] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isOn}
              className={`chip ${variant} archive-chip${isOn ? " archive-chip--on" : ""}`}
              onClick={() => setActiveCategory(isOn ? null : category)}
            >
              {category} <span className="archive-chip__count">{categoryCounts[category] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="archive-body">
        {years.length === 0 ? (
          <p className="archive-empty">no posts match that filter yet.</p>
        ) : (
          years.map(([year, yearPosts]) => (
            <section key={year} className="archive-year">
              <div className="archive-year__label">{year}</div>
              <ul className="archive-year__list">
                {yearPosts.map((post) => {
                  const chipVariant = CATEGORY_CHIP[post.category ?? ""] ?? "";
                  return (
                    <li key={post.slug}>
                      <a
                        ref={(el) => {
                          rowRefs.current[post.slug] = el;
                        }}
                        href={`/${post.slug}`}
                        className="archive-row"
                        onPointerEnter={(e) => showPreview(post, e)}
                        onPointerMove={movePreview}
                        onPointerLeave={() => setPreview(null)}
                      >
                        <span className="archive-row__date">{formatDate(post.date)}</span>
                        <span className="archive-row__title">{post.title}</span>
                        <span className="archive-row__meta">
                          {post.category && (
                            <span className={`chip ${chipVariant}`.trim()}>
                              {post.category}
                            </span>
                          )}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
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
    </div>
  );
}
