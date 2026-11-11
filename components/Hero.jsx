import { siteImageUrl } from "@/lib/format";
import { SiteImage } from "./SiteImage";
import { CategoryExplorer } from "./CategoryExplorer";

export function Hero({ settings, products, taxonomy }) {
  const heroImage = siteImageUrl(settings.hero_image_url);
  const hasExplorer = Array.isArray(taxonomy) && taxonomy.length > 0;

  return (
    <header
      id="hero"
      className={heroImage ? "hero fade-in has-owner-hero-image" : "hero fade-in"}
    >
      {heroImage ? (
        <SiteImage
          id="hero-background-image"
          className="hero-background-image"
          src={heroImage}
          alt=""
          sizes="100vw"
          priority
          legacyWidths={[900, 1600, 2200]}
        />
      ) : null}
      <div className="hero-inner">
        <p className="section-label hero-label" id="hero-label">
          {settings.hero_label}
        </p>
        <h1 className="hero-title" id="hero-title">
          {settings.hero_title}
        </h1>
        <p className="hero-desc" id="hero-desc">
          {settings.hero_desc}
        </p>
        <div
          id="category-explorer"
          className="category-explorer"
          hidden={!hasExplorer}
        >
          <div className="category-explorer-grid" id="category-explorer-grid">
            <CategoryExplorer taxonomy={taxonomy} products={products} settings={settings} />
          </div>
        </div>
      </div>
    </header>
  );
}
