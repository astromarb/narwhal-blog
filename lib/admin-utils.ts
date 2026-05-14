import matter from "gray-matter";
import type { PostFrontmatter } from "@/lib/posts";

const KNOWN_KEYS: (keyof PostFrontmatter)[] = [
  "title", "slug", "date", "excerpt", "tags", "category", "readingTime", "tape",
];

export type ParsedPost = {
  known: Partial<PostFrontmatter>;
  unknownYaml: string;
  body: string;
};

export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function calcReadingTime(markdownBody: string): string {
  const plain = markdownBody
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/[#>*_\-]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const words = plain.split(" ").filter((w) => w.length > 0).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

export function parseFrontmatter(raw: string): ParsedPost {
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;

  const known: Partial<PostFrontmatter> = {};
  const unknownEntries: [string, unknown][] = [];

  for (const [k, v] of Object.entries(data)) {
    if ((KNOWN_KEYS as string[]).includes(k)) {
      (known as Record<string, unknown>)[k] = v;
    } else {
      unknownEntries.push([k, v]);
    }
  }

  const unknownYaml = unknownEntries
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");

  return { known, unknownYaml, body: parsed.content };
}

function yamlStr(val: unknown): string {
  if (typeof val === "string") return JSON.stringify(val);
  if (Array.isArray(val)) return `[${val.map((v) => JSON.stringify(v)).join(", ")}]`;
  return String(val ?? "");
}

export function serializePost(
  known: Partial<PostFrontmatter>,
  unknownYaml: string,
  body: string
): string {
  const lines: string[] = ["---"];

  for (const key of KNOWN_KEYS) {
    const val = (known as Record<string, unknown>)[key];
    if (val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0)) {
      lines.push(`${key}: ${yamlStr(val)}`);
    }
  }

  if (unknownYaml.trim()) {
    lines.push(unknownYaml.trim());
  }

  lines.push("---");
  lines.push("");
  lines.push(body.trim());
  lines.push("");

  return lines.join("\n");
}
