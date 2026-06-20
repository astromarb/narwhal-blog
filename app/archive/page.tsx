import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { getAllPosts, CATEGORY_CHIP } from "@/lib/posts";

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

export const metadata = { title: "Archive" };

export default function ArchivePage() {
  const posts = getAllPosts().map(({ html: _html, content: _content, ...p }) => p);

  // Group by year, descending
  const byYear = new Map<string, typeof posts>();
  for (const p of posts) {
    const y = getYear(p.date);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(p);
  }
  const years = [...byYear.keys()].sort((a, b) => Number(b) - Number(a));

  return (
    <>
      <SiteNav />
      <main className="blog-post-shell archive-shell" id="top">
        <header className="archive-header">
          <h1 className="archive-title">
            Archive<em>.</em>
          </h1>
        </header>

        <div className="archive-body">
          {years.length === 0 ? (
            <p className="archive-empty">no posts yet — check back soon.</p>
          ) : (
            years.map((year) => (
              <section key={year} className="archive-year">
                <div className="archive-year__label">{year}</div>
                <ul className="archive-year__list">
                  {byYear.get(year)!.map((p) => {
                    const chipVariant = CATEGORY_CHIP[p.category ?? ""] ?? "";
                    return (
                      <li key={p.slug}>
                        <a href={`/${p.slug}`} className="archive-row">
                          <span className="archive-row__date">{formatDate(p.date)}</span>
                          <span className="archive-row__title">{p.title}</span>
                          <span className="archive-row__meta">
                            {p.category && (
                              <span className={`chip ${chipVariant}`.trim()}>
                                {p.category}
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
      </main>
      <SiteFooter minimal noLinks />
    </>
  );
}
