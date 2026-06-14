import { describe, it, expect, vi, beforeEach } from "vitest";

// lib/posts.ts has `import "server-only"` which throws outside Next.js.
// Mock it to a no-op so we can import the module in tests.
vi.mock("server-only", () => ({}));

// vi.mock factories are hoisted to the top of the file, so any referenced
// variable must also be hoisted via vi.hoisted().
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn<[], boolean>(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn<[], string[]>(),
  readFileSync: vi.fn<[unknown], string>(),
}));

// Mock the filesystem so tests are hermetic and don't read real content/posts/.
vi.mock("node:fs", () => ({ default: mockFs, ...mockFs }));

import {
  getAllPosts,
  getPostBySlug,
  getAllTags,
  getAllCategories,
  getCategoryCounts,
  getLatestPost,
} from "@/lib/posts";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeMd(overrides: Record<string, string | string[]> = {}): string {
  const fields = {
    title: "Test Post",
    slug: "test-post",
    date: "2026-01-01",
    excerpt: "A test.",
    tags: ["misc"],
    category: "misc",
    ...overrides,
  };
  const tagLine = Array.isArray(fields.tags)
    ? `tags:\n  - ${(fields.tags as string[]).join("\n  - ")}`
    : `tags:\n  - ${fields.tags}`;
  return `---
title: "${fields.title}"
slug: "${fields.slug}"
date: "${fields.date}"
excerpt: "${fields.excerpt}"
${tagLine}
category: "${fields.category}"
---
Body text for ${fields.title}.
`;
}

function setupFs(files: Record<string, string>) {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readdirSync.mockReturnValue(Object.keys(files));
  mockFs.readFileSync.mockImplementation((p: unknown) => {
    const name = String(p).split("/").pop()!;
    if (files[name] !== undefined) return files[name];
    throw new Error(`ENOENT: no such file: ${String(p)}`);
  });
}

beforeEach(() => {
  mockFs.existsSync.mockReset();
  mockFs.mkdirSync.mockReset();
  mockFs.readdirSync.mockReset();
  mockFs.readFileSync.mockReset();
});

// ── getAllPosts ────────────────────────────────────────────────────────────────

describe("getAllPosts", () => {
  it("returns parsed posts for each .md file", () => {
    setupFs({ "hello.md": makeMd({ title: "Hello", slug: "hello", date: "2026-06-01" }) });
    const posts = getAllPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Hello");
    expect(posts[0].slug).toBe("hello");
  });

  it("sorts posts newest-first by date", () => {
    setupFs({
      "old.md": makeMd({ title: "Old", slug: "old", date: "2025-01-01" }),
      "new.md": makeMd({ title: "New", slug: "new", date: "2026-06-14" }),
    });
    const posts = getAllPosts();
    expect(posts[0].slug).toBe("new");
    expect(posts[1].slug).toBe("old");
  });

  it("skips files missing required title or date", () => {
    setupFs({
      "no-title.md": `---\ndate: "2026-01-01"\n---\nBody.\n`,
      "no-date.md":  `---\ntitle: "No Date"\n---\nBody.\n`,
      "valid.md":    makeMd(),
    });
    const posts = getAllPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].slug).toBe("test-post");
  });

  it("skips non-.md files in the posts directory", () => {
    setupFs({
      "README.md": makeMd({ title: "ReadMe", slug: "readme", date: "2026-01-01" }),
      "config.json": `{}`,
    });
    // readdirSync returns both, filter ensures only .md processed
    mockFs.readdirSync.mockReturnValue(["README.md", "config.json"]);
    mockFs.readFileSync.mockImplementation((p: unknown) => {
      if (String(p).endsWith("README.md")) return makeMd({ title: "ReadMe", slug: "readme", date: "2026-01-01" });
      throw new Error("not a md file");
    });
    const posts = getAllPosts();
    // Only README.md passes the .md filter
    expect(posts).toHaveLength(1);
  });

  it("derives slug from filename when frontmatter slug is absent", () => {
    setupFs({ "my-post.md": `---\ntitle: "My Post"\ndate: "2026-01-01"\n---\nBody.\n` });
    const posts = getAllPosts();
    expect(posts[0].slug).toBe("my-post");
  });

  it("does not crash when one file is malformed", () => {
    setupFs({
      "bad.md":  `not valid yaml: [[[`,
      "good.md": makeMd({ title: "Good", slug: "good", date: "2026-06-01" }),
    });
    // bad.md will either be skipped (no title/date) or throw and be caught
    const posts = getAllPosts();
    expect(posts.some((p) => p.slug === "good")).toBe(true);
  });

  it("converts Markdown body to HTML", () => {
    setupFs({ "post.md": makeMd() });
    const [post] = getAllPosts();
    expect(post.html).toContain("<p>");
  });

  it("builds a searchBlob from title, excerpt, category, tags, and body", () => {
    setupFs({
      "post.md": makeMd({ title: "My Title", excerpt: "Excerpt text", tags: ["ai"], category: "misc" }),
    });
    const [post] = getAllPosts();
    expect(post.searchBlob).toContain("my title");
    expect(post.searchBlob).toContain("excerpt text");
    expect(post.searchBlob).toContain("ai");
    expect(post.searchBlob).toContain("misc");
  });
});

// ── getPostBySlug ──────────────────────────────────────────────────────────────

describe("getPostBySlug", () => {
  it("returns the post with the matching slug", () => {
    setupFs({ "hello.md": makeMd({ title: "Hello", slug: "hello", date: "2026-06-01" }) });
    const post = getPostBySlug("hello");
    expect(post?.title).toBe("Hello");
  });

  it("returns null for a slug that does not exist", () => {
    setupFs({ "hello.md": makeMd({ slug: "hello", date: "2026-06-01" }) });
    expect(getPostBySlug("does-not-exist")).toBeNull();
  });
});

// ── getAllTags ─────────────────────────────────────────────────────────────────

describe("getAllTags", () => {
  it("collects all unique tags across posts", () => {
    setupFs({
      "a.md": makeMd({ slug: "a", date: "2026-01-01", tags: ["ai", "misc"] }),
      "b.md": makeMd({ slug: "b", date: "2026-02-01", tags: ["geoscience", "misc"] }),
    });
    const tags = getAllTags();
    expect(tags).toContain("ai");
    expect(tags).toContain("geoscience");
    expect(tags).toContain("misc");
    expect(tags.filter((t) => t === "misc")).toHaveLength(1); // deduplicated
  });

  it("returns tags in sorted order", () => {
    setupFs({ "a.md": makeMd({ slug: "a", date: "2026-01-01", tags: ["z-tag", "a-tag"] }) });
    const tags = getAllTags();
    expect(tags).toEqual([...tags].sort());
  });

  it("returns an empty array when no posts have tags", () => {
    setupFs({ "a.md": `---\ntitle: "No tags"\ndate: "2026-01-01"\n---\nBody.\n` });
    expect(getAllTags()).toEqual([]);
  });
});

// ── getAllCategories ───────────────────────────────────────────────────────────

describe("getAllCategories", () => {
  it("returns categories present in posts in canonical order", () => {
    setupFs({
      "a.md": makeMd({ slug: "a", date: "2026-01-01", category: "misc" }),
      "b.md": makeMd({ slug: "b", date: "2026-02-01", category: "code and ai" }),
    });
    const cats = getAllCategories();
    expect(cats).toContain("misc");
    expect(cats).toContain("code and ai");
    // "code and ai" precedes "misc" in CATEGORIES ordering
    expect(cats.indexOf("code and ai")).toBeLessThan(cats.indexOf("misc"));
  });

  it("does not include categories not present in any post", () => {
    setupFs({ "a.md": makeMd({ slug: "a", date: "2026-01-01", category: "misc" }) });
    const cats = getAllCategories();
    expect(cats).not.toContain("field notes");
    expect(cats).not.toContain("papers I'm reading");
  });
});

// ── getCategoryCounts ──────────────────────────────────────────────────────────

describe("getCategoryCounts", () => {
  it("counts posts per category", () => {
    setupFs({
      "a.md": makeMd({ slug: "a", date: "2026-01-01", category: "misc" }),
      "b.md": makeMd({ slug: "b", date: "2026-02-01", category: "misc" }),
      "c.md": makeMd({ slug: "c", date: "2026-03-01", category: "code and ai" }),
    });
    const counts = getCategoryCounts();
    expect(counts["misc"]).toBe(2);
    expect(counts["code and ai"]).toBe(1);
  });

  it("falls back to 'misc' for posts without a category", () => {
    setupFs({ "a.md": `---\ntitle: "No cat"\ndate: "2026-01-01"\n---\nBody.\n` });
    const counts = getCategoryCounts();
    expect(counts["misc"]).toBe(1);
  });
});

// ── getLatestPost ──────────────────────────────────────────────────────────────

describe("getLatestPost", () => {
  it("returns the most recent post", () => {
    setupFs({
      "old.md": makeMd({ slug: "old", date: "2025-01-01" }),
      "new.md": makeMd({ slug: "new", date: "2026-06-14" }),
    });
    expect(getLatestPost()?.slug).toBe("new");
  });

  it("returns null when there are no posts", () => {
    setupFs({});
    expect(getLatestPost()).toBeNull();
  });

  it("returns the only post when there is one", () => {
    setupFs({ "only.md": makeMd({ slug: "only", date: "2026-01-01" }) });
    expect(getLatestPost()?.slug).toBe("only");
  });
});
