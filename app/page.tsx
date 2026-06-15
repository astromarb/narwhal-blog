import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import WritingFilter from "@/components/WritingFilter";
import {
  getAllPosts,
  getAllCategories,
  getCategoryCounts,
  getLatestPost,
  CATEGORY_CHIP,
} from "@/lib/posts";
import { getSiteConfig } from "@/lib/site-config";

function formatDate(d: string): string {
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date
      .toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
      .toLowerCase()
      .replace(",", " /");
  } catch {
    return d;
  }
}

export default function HomePage() {
  const posts = getAllPosts().map(({ html: _html, content: _content, ...p }) => p);
  const categories = getAllCategories();
  const categoryCounts = getCategoryCounts();
  const latest = getLatestPost();
  const site = getSiteConfig();

  const latestChipVariant = latest ? (CATEGORY_CHIP[latest.category ?? ""] ?? "") : "";
  const postsForList = latest ? posts.filter(p => p.slug !== latest.slug) : posts;

  return (
    <>
      <SiteNav />
      <main className="blog-main" id="top">
        {/* ── HERO ── */}
        <section className="blog-hero" aria-labelledby="blog-title" id="latest">
          {/* Left column: title + tagline + chips + portrait */}
          <div className="blog-hero__left">
            <div className="tape-row">
              <span className="tape">{site.siteLabel}</span>
              {site.heroNote && <span className="note">{site.heroNote}</span>}
            </div>
            <h1 id="blog-title">
              {site.heroWord1} <em>{site.heroWord2}</em>
            </h1>
            <p className="blog-tagline">
              {site.tagline}
            </p>
          </div>

          {/* Right column: decorative image + latest-post feature card */}
          <div className="blog-hero__side">
            <div className="blog-hero__circuit" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero-circuit.png" alt="" aria-hidden="true" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.85 }} />
            </div>

            {latest ? (
              <a className="blog-feature-card" href={`/${latest.slug}`}>
                <span className="clabel" style={{ fontSize: 13 }}>latest post</span>
                <strong style={{ fontSize: "clamp(26px, 2.8vw, 38px)" }}>{latest.title}</strong>
                {latest.excerpt && (
                  <span className="feature-blurb" style={{ fontSize: 15 }}>{latest.excerpt}</span>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {latest.category && (
                    <span className={`chip ${latestChipVariant}`.trim()}>
                      {latest.category}
                    </span>
                  )}
                  {latest.readingTime && (
                    <span className="chip">{latest.readingTime} read</span>
                  )}
                </div>
                <span className="feature-date" style={{ fontSize: 13 }}>{formatDate(latest.date)}</span>
              </a>
            ) : (
              <div className="blog-feature-card" style={{ opacity: 0.45 }}>
                <span className="clabel">latest post</span>
                <strong>no posts yet</strong>
                <span className="feature-blurb">
                  drop a markdown file in content/posts/ to get started.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── ARCHIVE ── */}
        <WritingFilter
          posts={postsForList}
          categories={categories}
          categoryCounts={categoryCounts}
        />
      </main>
      <SiteFooter />
    </>
  );
}
