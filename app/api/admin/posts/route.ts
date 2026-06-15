import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import matter from "gray-matter";

const GITHUB_API = "https://api.github.com";

function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req.headers.get("authorization"), process.env.ADMIN_PASSWORD)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  // Fall back to local filesystem when GitHub is not configured (local dev).
  if (!repo || !process.env.GITHUB_TOKEN) {
    const { getAllPosts } = await import("@/lib/posts");
    const posts = getAllPosts().map(({ html: _h, content: _c, searchBlob: _s, ...p }) => p);
    return NextResponse.json({ ok: true, posts });
  }

  // List directory from GitHub so the admin always reflects the live repo.
  const dirUrl = `${GITHUB_API}/repos/${repo}/contents/content/posts?ref=${branch}`;
  const dirRes = await fetch(dirUrl, { headers: ghHeaders(), cache: "no-store" });

  if (!dirRes.ok) {
    if (dirRes.status === 404) {
      return NextResponse.json({ ok: true, posts: [] });
    }
    return NextResponse.json(
      { ok: false, error: `github directory listing failed: ${dirRes.status}` },
      { status: 500 }
    );
  }

  const files = await dirRes.json() as Array<{ name: string; sha: string; type: string }>;
  const mdFiles = files.filter((f) => f.type === "file" && /\.mdx?$/i.test(f.name));

  // Fetch content of each file in parallel to parse frontmatter.
  const settled = await Promise.allSettled(
    mdFiles.map(async (file) => {
      const fileUrl = `${GITHUB_API}/repos/${repo}/contents/content/posts/${file.name}?ref=${branch}`;
      const fileRes = await fetch(fileUrl, { headers: ghHeaders(), cache: "no-store" });
      if (!fileRes.ok) return null;
      const data = await fileRes.json() as { content: string };
      const raw = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
      const parsed = matter(raw);
      const fm = parsed.data as Record<string, unknown>;
      if (!fm.title || !fm.date) return null;
      const slug = typeof fm.slug === "string" ? fm.slug : file.name.replace(/\.mdx?$/i, "");
      return {
        slug,
        title: fm.title as string,
        date: String(fm.date).slice(0, 10),
        excerpt: fm.excerpt as string | undefined,
        category: fm.category as string | undefined,
        readingTime: fm.readingTime as string | undefined,
      };
    })
  );

  type PostMeta = {
    slug: string; title: string; date: string;
    excerpt?: string; category?: string; readingTime?: string;
  };

  const posts: PostMeta[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value !== null) {
      posts.push(r.value as PostMeta);
    }
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({ ok: true, posts });
}
