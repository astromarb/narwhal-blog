import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ArchiveExplorer from "@/components/ArchiveExplorer";
import { getAllPosts, getAllCategories, getCategoryCounts } from "@/lib/posts";

export const metadata = { title: "Archive" };

export default function ArchivePage() {
  const posts = getAllPosts().map(({ html: _html, content: _content, ...p }) => p);
  const categories = getAllCategories();
  const categoryCounts = getCategoryCounts();

  return (
    <>
      <SiteNav />
      <main className="blog-post-shell archive-shell" id="top">
        <header className="archive-header">
          <h1 className="archive-title">
            Archive<em>.</em>
          </h1>
        </header>

        <ArchiveExplorer
          posts={posts}
          categories={categories}
          categoryCounts={categoryCounts}
        />
      </main>
      <SiteFooter minimal noLinks />
    </>
  );
}
