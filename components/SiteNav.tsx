"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const MAIN_URL = "https://marvinlopezacevedo.com";
const LAB_URL  = "https://projects.marvinlopezacevedo.com";

type Tab = { href: string; label: string; external?: boolean };

const TABS: Tab[] = [
  { href: "#top",      label: "top" },
  { href: "/archive",  label: "archive" },
  { href: "#latest",   label: "latest" },
  { href: "#footer",   label: "links" },
];

export default function SiteNav() {
  const [active, setActive] = useState("top");
  const pathname = usePathname();
  const onHome = pathname === "/";

  // On a post page, hash-links (#top, #latest, #footer) resolve to the homepage.
  const resolve = (href: string) =>
    !onHome && href.startsWith("#") ? `/${href === "#top" ? "" : href}` : href;

  useEffect(() => {
    const ids = TABS.map((t) => t.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { threshold: [0.2, 0.45, 0.7], rootMargin: "-15% 0px -55% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="site-nav">
      <a className="brand" href={resolve("#top")}>
        <span className="mark">M</span>
        Blog
        <small>Marvin Lopez Acevedo</small>
      </a>
      <nav className="tabs" role="navigation" aria-label="Blog navigation">
        {TABS.map((t) => {
          const isPageLink = !t.href.startsWith("#");
          const isActive = isPageLink
            ? pathname === t.href
            : onHome && active === t.href.slice(1);
          return (
            <a
              key={t.href}
              href={resolve(t.href)}
              className={isActive ? "active" : ""}
              onClick={() => { if (!isPageLink) setActive(t.href.slice(1)); }}
            >
              {t.label}
            </a>
          );
        })}
        <a href={MAIN_URL} target="_blank" rel="noreferrer">
          ← main
        </a>
        <a href={LAB_URL} target="_blank" rel="noreferrer">
          projects ↗
        </a>
      </nav>
      <a className="nav-cta" href={resolve("#archive")}>read →</a>
    </header>
  );
}
