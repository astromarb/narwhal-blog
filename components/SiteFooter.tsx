import "./SiteFooter.css";
import FooterScene from "./FooterScene";

const FOOTER_LINKS = [
  { label: "GitHub",    href: "https://github.com/astromarb",                  external: true },
  { label: "Projects",  href: "https://projects.marvinlopezacevedo.com",        external: true },
  { label: "Main site", href: "https://marvinlopezacevedo.com",                 external: true },
  { label: "Email",     href: "mailto:marvlopezacevedo@gmail.com",              external: false },
];

const MINIMAL_LINKS = FOOTER_LINKS.filter(l => l.label === "GitHub" || l.label === "Email");

export default function SiteFooter({ minimal = false, noLinks = false }: { minimal?: boolean; noLinks?: boolean }) {
  const year = new Date().getFullYear();
  const links = minimal ? MINIMAL_LINKS : FOOTER_LINKS;
  return (
    <footer className="site-footer" id="footer" aria-labelledby="site-footer-title">
      <div className="site-footer__background" aria-hidden="true" />

      <div className="site-footer__inner">
        {!minimal && <section className="site-footer__identity">
          <a href="/" className="site-footer__brand" aria-label="Marvin Lopez home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/headshot.jpg"
              alt="Marvin Lopez Acevedo"
              className="site-footer__headshot"
            />
            <span>
              <h2 id="site-footer-title" className="site-footer__name">
                Marvin Lopez
              </h2>
              <p className="site-footer__tagline">
                Sporadic thoughts on AI, physics, geoscience, gaming, society, and technology.
              </p>
            </span>
          </a>
        </section>}

        {!noLinks && (
          <nav className={`site-footer__nav${minimal ? " site-footer__nav--minimal" : ""}`} aria-label="Footer navigation">
            <ul className="site-footer__links">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noreferrer" : undefined}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <div className="site-footer__landscape" aria-hidden="true">
        <FooterScene />
      </div>

      <div className="site-footer__bottom">
        <p>© {year} Marvin A. Lopez Acevedo. All rights reserved.</p>
        <div className="site-footer__legal">
          <a href="/#top">Top ↑</a>
          <a href="https://github.com/astromarb" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
