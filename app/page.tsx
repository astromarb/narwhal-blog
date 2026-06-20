import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import WritingFilter from "@/components/WritingFilter";
import {
  getAllPosts,
  getAllCategories,
  getCategoryCounts,
} from "@/lib/posts";
import { getSiteConfig } from "@/lib/site-config";

const PAGE_NAV_LINKS = [
  { label: "Archive",   href: "/archive",                                    external: false },
  { label: "GitHub",    href: "https://github.com/astromarb",                external: true  },
  { label: "Projects",  href: "https://projects.marvinlopezacevedo.com",     external: true  },
  { label: "Main site", href: "https://marvinlopezacevedo.com",              external: true  },
  { label: "Email",     href: "mailto:marvlopezacevedo@gmail.com",           external: false },
];


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

        <nav className="page-bottom-nav" aria-label="Site navigation">
          {PAGE_NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </main>
      <SiteFooter noLinks />
    </>
  );
}
