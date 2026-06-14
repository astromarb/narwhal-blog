import { describe, it, expect } from "vitest";
import {
  titleToSlug,
  calcReadingTime,
  parseFrontmatter,
  serializePost,
} from "@/lib/admin-utils";

// ── titleToSlug ────────────────────────────────────────────────────────────────

describe("titleToSlug", () => {
  it("lowercases and hyphenates a simple title", () => {
    expect(titleToSlug("My First Post")).toBe("my-first-post");
  });

  it("strips punctuation that would break a URL", () => {
    expect(titleToSlug("Hello, World! It's great.")).toBe("hello-world-its-great");
  });

  it("collapses multiple spaces/hyphens into one hyphen", () => {
    expect(titleToSlug("a  b   c")).toBe("a-b-c");
    expect(titleToSlug("a--b")).toBe("a-b");
  });

  it("strips leading and trailing hyphens", () => {
    expect(titleToSlug("  -hello- ")).toBe("hello");
  });

  it("preserves numbers", () => {
    expect(titleToSlug("Top 10 Reasons")).toBe("top-10-reasons");
  });

  it("returns an empty string for a blank or symbol-only title", () => {
    expect(titleToSlug("")).toBe("");
    expect(titleToSlug("!!!")).toBe("");
  });

  it("preserves an already-valid slug", () => {
    expect(titleToSlug("my-post-slug")).toBe("my-post-slug");
  });

  it("handles unicode by stripping non-ASCII", () => {
    // accented chars are not [a-z0-9\s-] so they are removed
    expect(titleToSlug("naïve café")).toBe("nave-caf");
  });
});

// ── calcReadingTime ────────────────────────────────────────────────────────────

describe("calcReadingTime", () => {
  it("returns '1 min' for a short body", () => {
    expect(calcReadingTime("Hello world")).toBe("1 min");
  });

  it("returns '1 min' for an empty body", () => {
    expect(calcReadingTime("")).toBe("1 min");
  });

  it("returns the correct minute count for longer text", () => {
    // 200 words = 1 min; 400 words = 2 min
    const fourHundredWords = Array(400).fill("word").join(" ");
    expect(calcReadingTime(fourHundredWords)).toBe("2 min");
  });

  it("strips Markdown syntax before counting words", () => {
    const md = "# Title\n**bold** text and _italic_ text and `code` block.";
    // After stripping: "Title bold text and italic text and code block." = 9 words → 1 min
    expect(calcReadingTime(md)).toBe("1 min");
  });

  it("ignores Markdown link syntax, keeping only the label", () => {
    const md = Array(200).fill("[label](https://example.com)").join(" ");
    expect(calcReadingTime(md)).toBe("1 min");
  });

  it("rounds up partial minutes", () => {
    const twoHundredOneWords = Array(201).fill("word").join(" ");
    expect(calcReadingTime(twoHundredOneWords)).toBe("2 min");
  });
});

// ── parseFrontmatter ──────────────────────────────────────────────────────────

const FULL_MD = `---
title: "Hello, and welcome."
slug: "hello-welcome"
date: "2026-06-14"
excerpt: "A test post."
tags:
  - misc
  - ai
category: "misc"
readingTime: "3 min"
tape: "off-the-clock"
---
This is the body.
`;

const MINIMAL_MD = `---
title: "Minimal"
date: "2026-01-01"
---
Body text here.
`;

const UNKNOWN_FIELDS_MD = `---
title: "Unknown fields"
date: "2026-03-01"
customKey: "custom-value"
anotherKey: 42
---
Body.
`;

describe("parseFrontmatter", () => {
  it("parses all known frontmatter fields", () => {
    const result = parseFrontmatter(FULL_MD);
    expect(result.known.title).toBe("Hello, and welcome.");
    expect(result.known.slug).toBe("hello-welcome");
    expect(result.known.date).toBe("2026-06-14");
    expect(result.known.excerpt).toBe("A test post.");
    expect(result.known.tags).toEqual(["misc", "ai"]);
    expect(result.known.category).toBe("misc");
    expect(result.known.readingTime).toBe("3 min");
    expect(result.known.tape).toBe("off-the-clock");
  });

  it("extracts the Markdown body", () => {
    const result = parseFrontmatter(FULL_MD);
    expect(result.body.trim()).toBe("This is the body.");
  });

  it("handles a post with only required fields", () => {
    const result = parseFrontmatter(MINIMAL_MD);
    expect(result.known.title).toBe("Minimal");
    expect(result.known.date).toBe("2026-01-01");
    expect(result.known.slug).toBeUndefined();
    expect(result.known.tags).toBeUndefined();
    expect(result.body.trim()).toBe("Body text here.");
  });

  it("separates unknown frontmatter fields into unknownYaml", () => {
    const result = parseFrontmatter(UNKNOWN_FIELDS_MD);
    expect(result.known.title).toBe("Unknown fields");
    expect(result.unknownYaml).toContain("customKey");
    expect(result.unknownYaml).toContain("anotherKey");
  });

  it("returns empty unknownYaml when all fields are known", () => {
    const result = parseFrontmatter(FULL_MD);
    expect(result.unknownYaml).toBe("");
  });

  it("handles a file with no frontmatter", () => {
    const result = parseFrontmatter("Just a body with no frontmatter.");
    expect(result.known).toEqual({});
    expect(result.body.trim()).toBe("Just a body with no frontmatter.");
  });
});

// ── serializePost ──────────────────────────────────────────────────────────────

describe("serializePost", () => {
  it("produces valid YAML frontmatter with known fields", () => {
    const result = serializePost(
      { title: "My Post", slug: "my-post", date: "2026-06-14" },
      "",
      "Body text."
    );
    expect(result).toContain('title: "My Post"');
    expect(result).toContain('slug: "my-post"');
    expect(result).toContain('date: "2026-06-14"');
    expect(result).toMatch(/^---\n/);
    expect(result).toContain("\n---\n");
  });

  it("includes tags as a YAML array", () => {
    const result = serializePost(
      { title: "T", date: "2026-01-01", tags: ["ai", "misc"] },
      "",
      "Body."
    );
    expect(result).toContain('["ai", "misc"]');
  });

  it("omits fields that are undefined or empty string", () => {
    const result = serializePost({ title: "T", date: "2026-01-01", excerpt: "" }, "", "Body.");
    expect(result).not.toContain("excerpt");
    expect(result).not.toContain("slug");
  });

  it("omits empty tag arrays", () => {
    const result = serializePost({ title: "T", date: "2026-01-01", tags: [] }, "", "Body.");
    expect(result).not.toContain("tags");
  });

  it("appends unknown YAML verbatim", () => {
    const result = serializePost(
      { title: "T", date: "2026-01-01" },
      'customKey: "hello"',
      "Body."
    );
    expect(result).toContain('customKey: "hello"');
  });

  it("includes the body after the closing ---", () => {
    const result = serializePost({ title: "T", date: "2026-01-01" }, "", "My body content.");
    const parts = result.split("---\n");
    // parts[0] = '', parts[1] = frontmatter, parts[2] = '\nMy body content.\n'
    expect(parts[2]).toContain("My body content.");
  });

  it("round-trips through parseFrontmatter", () => {
    const original = parseFrontmatter(FULL_MD);
    const serialized = serializePost(original.known, original.unknownYaml, original.body);
    const roundTripped = parseFrontmatter(serialized);
    expect(roundTripped.known.title).toBe(original.known.title);
    expect(roundTripped.known.slug).toBe(original.known.slug);
    expect(roundTripped.known.tags).toEqual(original.known.tags);
    expect(roundTripped.body.trim()).toBe(original.body.trim());
  });
});
