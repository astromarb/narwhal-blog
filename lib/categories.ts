export const CATEGORIES = [
  "field notes",
  "papers I'm reading",
  "code and ai",
  "misc",
] as const;

export type Category = (typeof CATEGORIES)[number];

const FILL_VARIANTS = ["fill", "fill2", "fill3"] as const;
const FILL_COLORS = ["var(--a1)", "var(--a2)", "var(--a3)"] as const;

// Rotate through the three accent colors — works for any number of categories
export const CATEGORY_CHIP: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c, i) => [c, FILL_VARIANTS[i % FILL_VARIANTS.length]])
);

export const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c, i) => [c, FILL_COLORS[i % FILL_COLORS.length]])
);
