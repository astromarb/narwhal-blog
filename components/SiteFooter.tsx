export default function SiteFooter() {
  return (
    <footer className="ascii-foot" id="footer">
      <div className="ascii-foot__top">
        <div className="ascii-foot__intro">
          Thanks for reading.
          <div className="kicker" style={{ marginTop: "6px" }}>
            Marvin Lopez Acevedo · Blog · 2026
          </div>
        </div>
        <div className="ascii-foot__links">
          <a href="#top">Top</a>
          <a href="#archive">Archive</a>
          <a href="https://marvinlopezacevedo.com">main Site</a>
          <a href="https://lab.marvinlopezacevedo.com">Projects</a>
          <a href="mailto:marvlopezacevedo@gmail.com">Email</a>
        </div>
      </div>
      <pre className="ascii-foot__art" aria-label="MARVIN">
{` __  __    _    ____ __     _____ _   _ 
|  \\/  |  / \\  |  _ \\\\ \\   / /_ _| \\ | |
| |\\/| | / _ \\ | |_) \\ \\ / / | ||  \\| |
| |  | |/ ___ \\|  _ < \\ V /  | || |\\  |
|_|  |_/_/   \\_\\_| \\_\\ \\_/  |___|_| \\_|`}
      </pre>
      <div className="ascii-foot__meta">
        <span>field journal</span>
        <span>markdown · committed · quiet</span>
        <span>built with rocks &amp; html</span>
      </div>
    </footer>
  );
}
