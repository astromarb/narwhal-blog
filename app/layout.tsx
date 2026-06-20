import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/site-config";
import LenisProvider from "@/components/LenisProvider";
import { SearchProvider } from "@/components/SearchProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "the wave · marvin a. lopez acevedo",
  description:
    "Field notes, paper margins, and quiet code — long-form writing from a geosciences PhD researcher.",
};

const fieldModeBoot = `
  (() => {
    try {
      const stored = window.localStorage.getItem("marvinFieldMode");
      document.documentElement.dataset.fieldMode = stored === "day" ? "day" : "night";
    } catch {
      document.documentElement.dataset.fieldMode = "night";
    }
  })();
`.trim();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colors: c, fontSizes: fs } = getSiteConfig();
  const cssOverrides = `
    :root {
      --paper:   ${c.paper};
      --paper-2: ${c.paper2};
      --paper-3: ${c.paper3};
      --ink:     ${c.ink};
      --ink-2:   ${c.ink2};
      --ink-3:   ${c.ink3};
      --a1:      ${c.a1};
      --a2:      ${c.a2};
      --a3:      ${c.a3};
      --hero-title-size: ${fs.heroTitle}px;
      --tagline-size: ${fs.tagline}px;
      --note-size: ${fs.noteText}px;
    }
  `.trim();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: fieldModeBoot }} />
        {/* Inline override sits after globals.css link so it wins on cascade */}
        <style dangerouslySetInnerHTML={{ __html: cssOverrides }} />
        <SearchProvider>
          <LenisProvider />
          {children}
        </SearchProvider>
      </body>
    </html>
  );
}
