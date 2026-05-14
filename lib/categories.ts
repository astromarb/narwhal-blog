export const CATEGORIES = [
  "field notes",
  "papers I'm reading",
  "code and ai",
  "misc",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_CHIP: Record<string, "fill" | "fill2" | "fill3" | ""> = {
  "field notes":        "fill",
  "papers I'm reading": "fill2",
  "code and ai":        "fill3",
  "misc":               "",
};
