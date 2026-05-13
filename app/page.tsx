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

export default function HomePage() {
  const allPosts = getAllPosts();
  const categories = getAllCategories();
  const categoryCounts = getCategoryCounts();
  const latest = getLatestPost();

  const posts = allPosts.map((p) => ({
    title: p.title,
    slug: p.slug,
    date: p.date,
    excerpt: p.excerpt,
    tags: p.tags,
    category: p.category,
    readingTime: p.readingTime,
    searchBlob: p.searchBlob,
  }));

  const categoryChip =
    latest && latest.category
      ? CATEGORY_CHIP[latest.category] ?? ""
      : "";

  return (
    <>
      <SiteNav />
      <main className="blog-main" id="top">
        <section
          className="blog-hero"
          aria-labelledby="blog-title"
          id="latest"
        >
          <div>
            <div className="tape-row">
              <span className="tape">blog / field journal</span>
              <span className="note">markdown notes, committed.</span>
            </div>
            <h1 id="blog-title">
              Field <em>journal.</em>
            </h1>
            <p className="blog-tagline">
              field notes, paper rereads, code &amp; ai detours, and the
              occasional thing that doesn&apos;t fit anywhere else.
            </p>
            <div className="hero-chips">
              {categories.map((c) => (
                <span key={c} className="chip">
                  {c} / {categoryCounts[c] ?? 0}
                </span>
              ))}
            </div>
          </div>

          <div className="blog-hero__side">
            <figure className="blog-hero__portrait" aria-label="Headshot">
              {/* Static asset under apps/blog/public/headshot.jpg */}
              <img src="/headshot.jpg" alt="Marvin A. Lopez Acevedo" />
            </figure>

            {latest && (
              <a className="blog-feature-card" href={`/${latest.slug}`}>
                <span className="clabel">— latest note</span>
                <span className="feature-date">
                  {formatDate(latest.date)}
                </span>
                <strong>{latest.title}</strong>
                {latest.excerpt && (
                  <span className="feature-blurb">{latest.excerpt}</span>
                )}
                {latest.category && (
                  <span className={`chip ${categoryChip}`.trim()}>
                    {latest.category}
                  </span>
                )}
              </a>
            )}
          </div>
        </section>

        <WritingFilter
          posts={posts}
          categories={categories}
          categoryCounts={categoryCounts}
        />
      </main>
      <SiteFooter />
    </>
  );
}
