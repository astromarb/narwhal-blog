import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import {
  getAllPosts,
  getPostBySlug,
  CATEGORY_CHIP,
} from "@/lib/posts";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "post not found · blog" };
  return {
    title: `${post.title} · blog`,
    description: post.excerpt ?? undefined,
  };
}

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

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const all = getAllPosts();
  const idx = all.findIndex((p) => p.slug === post.slug);
  // Posts are date-DESC, so "previous in time" is at idx+1, "next in time" at idx-1.
  const olderPost = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  const newerPost = idx > 0 ? all[idx - 1] : null;

  const chipVariant = CATEGORY_CHIP[post.category ?? ""] ?? "";

  return (
    <>
      <SiteNav />
      <main className="blog-post-shell" id="top">
        <article className="blog-article">
          <header className="blog-article-header">
            <a className="blog-back" href="/#archive">
              ← back to archive
            </a>
            <div className="tape-row">
              {post.tape && <span className="tape">{post.tape}</span>}
              <span className="note">{formatDate(post.date)}</span>
            </div>
            <h1>{post.title}</h1>
            {post.excerpt && <p>{post.excerpt}</p>}
            <div className="hero-chips">
              {post.category && (
                <span className={`chip ${chipVariant}`.trim()}>
                  {post.category}
                </span>
              )}
              {post.readingTime && (
                <span className="chip">{post.readingTime} read</span>
              )}
            </div>
          </header>

          <div>
            <div
              className="post-body"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />

            <nav className="post-pager" aria-label="Post navigation">
              {olderPost ? (
                <a href={`/${olderPost.slug}`}>
                  <span>previous</span>
                  <strong>{olderPost.title}</strong>
                </a>
              ) : (
                <span className="pager-empty" aria-hidden="true" />
              )}
              {newerPost ? (
                <a href={`/${newerPost.slug}`}>
                  <span>next</span>
                  <strong>{newerPost.title}</strong>
                </a>
              ) : (
                <span className="pager-empty" aria-hidden="true" />
              )}
            </nav>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
