import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { CATEGORIES } from "@/lib/categories";
export { CATEGORIES, CATEGORY_CHIP } from "@/lib/categories";
export type { Category } from "@/lib/categories";

export type PostFrontmatter = {
  title: string;
  slug: string;
  date: string;
  excerpt?: string;
  tags?: string[];
  category?: string;
  readingTime?: string;
  tape?: string;
};

export type Post = PostFrontmatter & {
  content: string;
  html: string;
  searchBlob: string;
};

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function ensureDir(): void {
  if (!fs.existsSync(POSTS_DIR)) {
    try {
      fs.mkdirSync(POSTS_DIR, { recursive: true });
    } catch {
      // Vercel's serverless runtime is read-only; if the directory is missing
      // from the bundle, mkdirSync throws EROFS. Swallow it — readdirSync
      // will return [] and getAllPosts will safely return an empty list.
    }
  }
}

function readPostFile(filename: string): Post | null {
  const filePath = path.join(POSTS_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as Partial<PostFrontmatter>;

  if (!data.title || !data.date) return null;

  const slug =
    data.slug ?? filename.replace(/\.mdx?$/i, "").toLowerCase();

  const rawHtml = marked.parse(parsed.content, { async: false }) as string;
  const html = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });

  const plain = parsed.content
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/[#>*_\-]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const searchBlob = [
    data.title,
    data.excerpt ?? "",
    data.category ?? "",
    (data.tags ?? []).join(" "),
    plain,
  ]
    .join(" ")
    .toLowerCase();

  return {
    title: data.title,
    slug,
    date: data.date,
    excerpt: data.excerpt ?? "",
    tags: data.tags ?? [],
    category: data.category ?? "misc",
    readingTime: data.readingTime,
    tape: data.tape,
    content: parsed.content,
    html,
    searchBlob,
  };
}

export function getAllPosts(): Post[] {
  ensureDir();
  let files: string[];
  try {
    files = fs.readdirSync(POSTS_DIR).filter((f) => /\.mdx?$/i.test(f));
  } catch {
    return [];
  }

  const posts = files
    .map((f) => {
      try {
        return readPostFile(f);
      } catch {
        return null;
      }
    })
    .filter((p): p is Post => p !== null);

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  const all = getAllPosts();
  return all.find((p) => p.slug === slug) ?? null;
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const p of getAllPosts()) {
    (p.tags ?? []).forEach((t) => tags.add(t));
  }
  return Array.from(tags).sort();
}

export function getAllCategories(): string[] {
  const cats = new Set<string>();
  for (const p of getAllPosts()) {
    if (p.category) cats.add(p.category);
  }
  const ordered: string[] = [];
  for (const c of CATEGORIES) if (cats.has(c)) ordered.push(c);
  for (const c of cats) if (!ordered.includes(c)) ordered.push(c);
  return ordered;
}

export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of getAllPosts()) {
    const k = p.category ?? "misc";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

export function getLatestPost(): Post | null {
  const all = getAllPosts();
  return all.length > 0 ? all[0] : null;
}
