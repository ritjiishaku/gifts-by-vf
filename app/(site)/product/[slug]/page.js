import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProductBySlug,
  getSettings,
  getProducts,
} from "@/lib/data";
import { settingsFromRows, waLink, SITE_URL } from "@/lib/site";
import {
  directImageUrl,
  validateUrl,
  videoUrl,
  isSoldOut,
  formatNaira,
  priceNumber,
  slugify,
  isFeatured,
} from "@/lib/format";
import { TAXONOMY } from "@/lib/taxonomy";
import { taxonomyCategoryForProduct, taxonomyProductTypeForProduct } from "@/lib/taxonomy";
import { Icon, WaIcon } from "@/components/icons";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const slug = params.slug;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const image = validateUrl(directImageUrl(product.image_url));
  const description = product.description || "";
  const title = product.name;
  return {
    title,
    description,
    alternates: { canonical: `/product/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/product/${slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: description || undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }) {
  const slug = params.slug;
  const [product, settingsRows, allProducts] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
    getProducts(),
  ]);

  if (!product) notFound();

  const settings = settingsFromRows(settingsRows);
  const image = validateUrl(directImageUrl(product.image_url));
  const video = videoUrl(product.video_url);
  const soldOut = isSoldOut(product);
  const price = formatNaira(product.price);
  const numPrice = priceNumber(product);
  const category = taxonomyCategoryForProduct(product, TAXONOMY)?.name || product.category || "";
  const productType = taxonomyProductTypeForProduct(product, TAXONOMY);
  const waMessage = `Hello! I'd like to order ${product.name}${price ? ` (from ${price})` : ""}.`;
  const waHref = waLink(settings, waMessage);
  const soldOutWaHref = waLink(settings, `Hello! I'd like to enquire about ${product.name} as a custom order.`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: image ? [image] : undefined,
    url: `${SITE_URL}/product/${encodeURIComponent(slugify(product.name))}`,
    brand: { "@type": "Brand", name: "Gifts by VF" },
    category: category || undefined,
  };
  if (numPrice != null && numPrice > 0) {
    jsonLd.offers = {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: numPrice,
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: waHref,
    };
  }

  const meta = [
    ["Material", product.material],
    ["Size", product.size],
    ["Processing time", product.turnaround],
    ["Delivery", product.delivery_note || product.delivery_notes],
    ["Payment", product.payment_note || product.payment_terms],
  ].filter(([, v]) => v != null && String(v).trim() !== "");

  const related = allProducts
    .filter((p) => String(p.id) !== String(product.id))
    .filter((p) => {
      const pc = taxonomyCategoryForProduct(p, TAXONOMY)?.name;
      return category ? pc === category : true;
    })
    .slice()
    .sort(
      (a, b) =>
        Number(isFeatured(b)) - Number(isFeatured(a)) ||
        (parseInt(a.display_order, 10) || 999) - (parseInt(b.display_order, 10) || 999)
    );

  const typeVisible =
    productType && productType.trim().toLowerCase() !== String(product.name).trim().toLowerCase();
  const showFlags = typeVisible;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section id="product-detail" className="product-detail fade-in">
        <div className="section-inner">
          <div className="product-detail-grid">
            <div className="product-detail-media">
              <div className={`product-img${image ? "" : " no-image"}`}>
                {image ? (
                  <img src={image} alt={product.name} decoding="async" />
                ) : null}
                <div className="product-icon-fallback">
                  <Icon name={String(product.icon || category || "").trim().toLowerCase()} />
                </div>
                <span className={`product-badge${soldOut ? " out" : ""}`}>
                  {soldOut ? String(product.stock_label || "").trim() || "Sold Out" : category || "Custom"}
                </span>
              </div>

              {video ? (
                <div className="product-video">
                  {video.type === "iframe" ? (
                    <iframe
                      src={video.src}
                      title={`Video of ${product.name}`}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={video.src} controls playsInline />
                  )}
                </div>
              ) : null}
            </div>

            <div className="product-detail-info">
              <nav aria-label="Breadcrumb" className="product-breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden="true"> / </span>
                <span>{category || "Products"}</span>
              </nav>

              {showFlags ? (
                <div className="product-card-flags">
                  <span className="product-type-label">{productType}</span>
                </div>
              ) : null}

              <h1>{product.name}</h1>
              {price ? <span className="product-price">From {price}</span> : null}
              {product.description ? <p className="product-detail-desc">{product.description}</p> : null}
              {product.sales_caption ? (
                <p className="product-sales-caption">{product.sales_caption}</p>
              ) : null}

              {meta.length ? (
                <ul className="product-meta">
                  {meta.map(([k, v]) => (
                    <li key={k}>
                      <span>{k}:</span> {v}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="product-actions">
                <a
                  href={soldOut ? soldOutWaHref : waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="product-order-btn"
                  aria-label={soldOut ? `Request a custom quote for ${product.name}` : `Order ${product.name} on WhatsApp`}
                >
                  <WaIcon />
                  <span>{soldOut ? "Request a custom quote" : "Order this gift"}</span>
                </a>
                <CopyLinkButton slug={slugify(product.name)} name={product.name} />
              </div>
            </div>
          </div>

          {related.length ? (
            <div className="product-related">
              <div className="catalogue-header fade-in">
                <p className="section-label">{category ? `More in ${category}` : "Explore more"}</p>
                <h2 className="section-title">{category ? `All ${category} gifts` : "You may also like"}</h2>
                <p className="section-desc">
                  {related.length} {related.length === 1 ? "piece" : "pieces"} waiting to be discovered in
                  {category ? ` ${category}` : " this collection"}.
                </p>
              </div>
              <div className="products-grid">
                {related.map((p) => (
                  <ProductCard key={p.id} p={p} pid={p.id} settings={settings} taxonomy={TAXONOMY} ref={null} />
                ))}
              </div>
              <div className="product-catalogue-link">
                <Link href="/#products" className="product-order-btn">
                  <span>Browse the full catalogue</span>
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
