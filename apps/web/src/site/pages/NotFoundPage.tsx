import { SiteLink } from "../SiteLink.js";

export function NotFoundPage() {
  return (
    <section className="page-section page-hero">
      <p className="eyebrow">Page not found</p>
      <h1>We couldn't find that page</h1>
      <p className="lede">That address may have changed. Explore available careers or return home.</p>
      <div className="hero-ctas">
        <SiteLink className="button-secondary" to="/careers">Explore careers</SiteLink>
        <SiteLink className="button-secondary" to="/">Home</SiteLink>
      </div>
    </section>
  );
}
