import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type SiteColors = {
  paper: string;
  paper2: string;
  paper3: string;
  ink: string;
  ink2: string;
  ink3: string;
  a1: string;
  a2: string;
  a3: string;
};

export type FontSizes = {
  heroTitle: number;
  tagline: number;
  noteText: number;
};

export type SiteConfig = {
  siteLabel: string;
  heroNote: string;
  heroWord1: string;
  heroWord2: string;
  tagline: string;
  colors: SiteColors;
  fontSizes: FontSizes;
};

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteLabel: "Blog / Field Journal",
  heroNote: "Welcome.",
  heroWord1: "Field",
  heroWord2: "journal.",
  tagline: "Thoughts and findings on a range of topics I'm interested in.",
  colors: {
    paper: "#0a0908",
    paper2: "#1c1a16",
    paper3: "#252219",
    ink: "#e3ddd4",
    ink2: "#9a9388",
    ink3: "#5c5852",
    a1: "#dc2626",
    a2: "#facc15",
    a3: "#60a5fa",
  },
  fontSizes: { heroTitle: 118, tagline: 34, noteText: 22 },
};

const CONFIG_PATH = path.join(process.cwd(), "content", "site-config.md");

function parseRaw(raw: string): SiteConfig {
  const { data } = matter(raw);
  const d = DEFAULT_SITE_CONFIG;
  const dc = d.colors;
  const dfs = d.fontSizes;
  const rc = (data.colors ?? {}) as Partial<Record<string, string>>;
  const rfs = (data.fontSizes ?? {}) as Partial<Record<string, number>>;
  return {
    siteLabel: String(data.siteLabel ?? d.siteLabel),
    heroNote: String(data.heroNote ?? d.heroNote),
    heroWord1: String(data.heroWord1 ?? d.heroWord1),
    heroWord2: String(data.heroWord2 ?? d.heroWord2),
    tagline: String(data.tagline ?? d.tagline),
    colors: {
      paper: String(rc.paper ?? dc.paper),
      paper2: String(rc.paper2 ?? dc.paper2),
      paper3: String(rc.paper3 ?? dc.paper3),
      ink: String(rc.ink ?? dc.ink),
      ink2: String(rc.ink2 ?? dc.ink2),
      ink3: String(rc.ink3 ?? dc.ink3),
      a1: String(rc.a1 ?? dc.a1),
      a2: String(rc.a2 ?? dc.a2),
      a3: String(rc.a3 ?? dc.a3),
    },
    fontSizes: {
      heroTitle: Number(rfs.heroTitle ?? dfs.heroTitle),
      tagline: Number(rfs.tagline ?? dfs.tagline),
      noteText: Number(rfs.noteText ?? dfs.noteText),
    },
  };
}

export function getSiteConfig(): SiteConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return parseRaw(raw);
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}

export function serializeSiteConfig(config: SiteConfig): string {
  const c = config.colors;
  const fs = config.fontSizes;
  return [
    "---",
    `siteLabel: "${config.siteLabel}"`,
    `heroNote: "${config.heroNote}"`,
    `heroWord1: "${config.heroWord1}"`,
    `heroWord2: "${config.heroWord2}"`,
    `tagline: "${config.tagline}"`,
    "colors:",
    `  paper: "${c.paper}"`,
    `  paper2: "${c.paper2}"`,
    `  paper3: "${c.paper3}"`,
    `  ink: "${c.ink}"`,
    `  ink2: "${c.ink2}"`,
    `  ink3: "${c.ink3}"`,
    `  a1: "${c.a1}"`,
    `  a2: "${c.a2}"`,
    `  a3: "${c.a3}"`,
    "fontSizes:",
    `  heroTitle: ${fs.heroTitle}`,
    `  tagline: ${fs.tagline}`,
    `  noteText: ${fs.noteText}`,
    "---",
    "",
  ].join("\n");
}
