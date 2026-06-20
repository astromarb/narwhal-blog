import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import WritingFilter from "@/components/WritingFilter";
import {
  getAllPosts,
  getAllCategories,
  getCategoryCounts,
} from "@/lib/posts";
import { getSiteConfig } from "@/lib/site-config";



export default function HomePage() {
  const posts = getAllPosts().map(({ html: _html, content: _content, ...p }) => p);
  const categories = getAllCategories();
  const categoryCounts = getCategoryCounts();
  const site = getSiteConfig();

  return (
    <>
      <SiteNav />
      <main className="blog-main" id="top">
        {/* ── HERO ── */}
        <section className="blog-hero" aria-labelledby="blog-title" id="latest">
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
        </section>

        {/* ── ARCHIVE ── */}
        <WritingFilter
          posts={posts}
          categories={categories}
          categoryCounts={categoryCounts}
        />
      </main>
      <SiteFooter noLinks showPageNav />
    </>
  );
}
