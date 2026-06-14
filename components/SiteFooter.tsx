import "./SiteFooter.css";
import FooterScene from "./FooterScene";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const footerGroups: { title: string; links: FooterLink[] }[] = [
  {
    title: "Read",
    links: [
      { label: "Posts", href: "/#archive" },
      { label: "Tags", href: "/#archive" },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "GitHub", href: "https://github.com/astromarb", external: true },
      { label: "Projects", href: "https://lab.marvinlopezacevedo.com", external: true },
    ],
  },
  {
    title: "Site",
    links: [
      { label: "About", href: "/#about" },
      { label: "Main site", href: "https://marvinlopezacevedo.com", external: true },
      { label: "Email", href: "mailto:marvlopezacevedo@gmail.com" },
    ],
  },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" aria-labelledby="site-footer-title">
      <div className="site-footer__background" aria-hidden="true" />

      <div className="site-footer__inner">
        <section className="site-footer__identity">
          <a href="/" className="site-footer__brand" aria-label="Marvin Lopez home">
            <span className="site-footer__mark" aria-hidden="true">
              <span className="site-footer__star">✦</span>
              <span className="site-footer__orbit" />
              <span className="site-footer__dot" />
            </span>
            <span>
              <h2 id="site-footer-title" className="site-footer__name">
                Marvin Lopez
              </h2>
              <p className="site-footer__tagline">
                Sporadic thoughts on AI, physics, geoscience, gaming, society, and technology.
              </p>
            </span>
          </a>
        </section>

        <nav className="site-footer__nav" aria-label="Footer navigation">
          {footerGroups.map((group) => (
            <div className="site-footer__group" key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map((link) => (
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
            </div>
          ))}
        </nav>
      </div>

      <div className="site-footer__landscape" aria-hidden="true">
        <FooterScene />
      </div>

      <div className="site-footer__bottom">
        <p>© {year} Marvin A. Lopez Acevedo. All rights reserved.</p>
        <div className="site-footer__legal">
          <a href="/#top">Top ↑</a>
          <span aria-hidden="true">•</span>
          <a href="https://github.com/astromarb" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
