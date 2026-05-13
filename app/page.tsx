import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="blog-main" id="top">
        <section className="blog-hero" aria-labelledby="blog-title" id="latest">
          <div>
            <div className="tape-row">
              <span className="tape">blog / field journal</span>
              <span className="note">work in progress.</span>
            </div>
            <h1 id="blog-title">
              Field <em>journal.</em>
            </h1>
          </div>
        </section>

        <section className="wip-block" id="archive" aria-label="Blog archive">
          <div className="wip">
            <div className="wip-tag">— wip</div>
            <p className="wip-text">work in progress</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
