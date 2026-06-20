"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSearch } from "@/components/SearchProvider";

const MAIN_URL = "https://marvinlopezacevedo.com";
const LAB_URL  = "https://projects.marvinlopezacevedo.com";

type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: "#top",     label: "top" },
  { href: "/archive", label: "archive" },
  { href: "#footer",  label: "links" },
];

function NavSearch({ onHome }: { onHome: boolean }) {
  const { setQuery } = useSearch();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle() {
    setOpen((v) => {
      if (!v) requestAnimationFrame(() => inputRef.current?.focus());
      else { setValue(""); setQuery(""); }
      return !v;
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    if (onHome) setQuery(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setValue(""); setQuery(""); setOpen(false); }
    if (e.key === "Enter" && !onHome) {
      setQuery(value);
      router.push(`/?q=${encodeURIComponent(value)}`);
    }
  }

  return (
    <div className={`nav-search${open ? " nav-search--open" : ""}`}>
      <button
        type="button"
        className="nav-search__btn"
        onClick={toggle}
        aria-label={open ? "Close search" : "Search posts"}
        aria-expanded={open}
      >
        {open ? "✕" : "⌕"}
      </button>
      <div className="nav-search__field" aria-hidden={!open}>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="search…"
          aria-label="Search posts"
          tabIndex={open ? 0 : -1}
        />
      </div>
    </div>
  );
}

export default function SiteNav() {
  const [active, setActive] = useState("top");
  const pathname = usePathname();
  const onHome = pathname === "/";

  const resolve = (href: string) =>
    !onHome && href.startsWith("#") ? `/${href === "#top" ? "" : href}` : href;

  useEffect(() => {
    const hashTabs = TABS.filter((t) => t.href.startsWith("#"));
    const sections = hashTabs
      .map((t) => document.getElementById(t.href.slice(1)))
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
      </a>
      {!onHome && (
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
        </nav>
      )}
      <div className="nav-right">
        <NavSearch onHome={onHome} />
        {!onHome && (
          <>
            <a href={LAB_URL} target="_blank" rel="noreferrer" className="nav-projects">
              projects ↗
            </a>
            <a className="nav-cta" href={MAIN_URL} target="_blank" rel="noreferrer">
              main →
            </a>
          </>
        )}
      </div>
    </header>
  );
}
