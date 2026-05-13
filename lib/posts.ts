import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

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
  /** Lowercased haystack for client-side semantic-ish search */
  searchBlob: string;
};

/** Stable category order across the blog UI. */
export const CATEGORIES = [
  "field notes",
  "papers I'm reading",
  "code and ai",
  "misc",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Visual chip variant per category — keeps colors stable across pages. */
export const CATEGORY_CHIP: Record<string, "fill" | "fill2" | "fill3" | ""> = {
  "field notes": "fill",
  "papers I'm reading": "fill2",
  "code and ai": "fill3",
  "misc": "",
};

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function ensureDir(): void {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
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

  const html = marked.parse(parsed.content, { async: false }) as string;

  // Strip markdown markers so the search blob is closer to plain prose.
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
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => /\.mdx?$/i.test(f));

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
  // Preserve canonical order; append unknown categories at the end.
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
