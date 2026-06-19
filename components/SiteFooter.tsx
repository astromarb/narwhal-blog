import "./SiteFooter.css";
import FooterScene from "./FooterScene";

const FOOTER_LINKS = [
  { label: "GitHub",    href: "https://github.com/astromarb",                  external: true },
  { label: "Projects",  href: "https://projects.marvinlopezacevedo.com",        external: true },
  { label: "Main site", href: "https://marvinlopezacevedo.com",                 external: true },
  { label: "Email",     href: "mailto:marvlopezacevedo@gmail.com",              external: false },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" id="footer" aria-labelledby="site-footer-title">
      <div className="site-footer__background" aria-hidden="true" />

      <div className="site-footer__inner">
        <nav className="site-footer__nav" aria-label="Footer navigation">
          <ul className="site-footer__links">
            {FOOTER_LINKS.map((link) => (
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
