"use client";

import { useEffect, useState } from "react";
import { Icon, WaIcon } from "./icons";
import { openLightbox } from "./Lightbox";
import { SiteImage } from "./SiteImage";
import { getReferral, subscribeReferral } from "./referral-store";
import {
  validateUrl,
  directImageUrl,
  videoUrl,
  formatNaira,
  isSoldOut,
  isDriveUrl,
  slugify,
  isFeatured,
} from "@/lib/format";
import { taxonomyCategoryForProduct, taxonomyProductTypeForProduct, normalizeTaxonomyText } from "@/lib/taxonomy";
import { waLink } from "@/lib/site";

export function orderMessage(productName, price, ref) {
  let msg = productName
    ? `Hello! I'd like to order ${productName}${price ? ` (from ${price})` : ""}.`
    : "Hello! I would love to place an order with Gifts by VF.";
  if (ref && ref.name) msg += ` I was referred by ${ref.name}.`;
  return msg;
}

export function ProductCard({ p, pid, settings, taxonomy, ref }) {
  const [storeRef, setStoreRef] = useState(getReferral);
  useEffect(() => {
    setStoreRef(getReferral());
    return subscribeReferral(() => setStoreRef(getReferral()));
  }, []);

  let imageUrl = String(p.image_url || "").trim();
  let video = videoUrl(p.video_url);

  if (!video) {
    const peek = videoUrl(imageUrl);
    if (peek && !isDriveUrl(imageUrl)) {
      video = peek;
      imageUrl = "";
    }
  }

  const url = validateUrl(directImageUrl(imageUrl));
  const price = formatNaira(p.price);
  const taxonomyCategory = taxonomyCategoryForProduct(p, taxonomy);
  const category = taxonomyCategory ? taxonomyCategory.name : String(p.category || "").trim() || "Custom";
  const productType = taxonomyProductTypeForProduct(p, taxonomy);
  const slug = String(p.slug || "").trim() || slugify(p.name) || slugify(pid);
  const soldOut = isSoldOut(p);
  const badgeLabel = soldOut ? String(p.stock_label || "").trim() || "Sold Out" : category;
  const orderText = soldOut ? "Request a custom quote" : "Order this gift";
  const activeRef = ref || storeRef;
  const waHref = waLink(settings, orderMessage(p.name, price, activeRef));

  const typeVisible =
    productType && normalizeTaxonomyText(productType) !== normalizeTaxonomyText(p.name);
  const featured = isFeatured(p);
  const showFlags = featured || typeVisible;

  const meta = [
    ["Material", p.material],
    ["Size", p.size],
    ["Processing time", p.turnaround],
    ["Delivery", p.delivery_note || p.delivery_notes],
    ["Payment", p.payment_note || p.payment_terms],
  ].filter(([, v]) => v != null && String(v).trim() !== "");

  const iconKey = String(p.icon || category || "").trim().toLowerCase();

  const onImageError = (event) => {
    const img = event.currentTarget;
    if (!img.dataset.retried) {
      img.dataset.retried = "true";
      img.removeAttribute("srcset");
      img.src = url;
    } else {
      img.closest(".product-img")?.classList.add("no-image");
    }
  };

  return (
    <div className={`product-card fade-in${soldOut ? " is-soldout" : ""}`} id={`product-${slug}`}>
      <div className={`product-img${url ? "" : " no-image"}`}>
        {url || video ? (
          <button
            type="button"
            className="js-lightbox"
            aria-label={`${video ? "Play video of" : "View larger image of"} ${p.name}`}
            onClick={() =>
              openLightbox({
                url,
                name: p.name,
                video: video ? { src: video.src, type: video.type } : null,
              })
            }
          >
            {url ? (
              <SiteImage
                src={url}
                alt={p.name}
                sizes="(min-width: 768px) 320px, 100vw"
                onError={onImageError}
              />
            ) : null}
            {video ? (
              <span className="product-play-wrap" aria-hidden="true">
                <span className="product-play"></span>
                <span className="product-play-label">Watch</span>
              </span>
            ) : null}
          </button>
        ) : null}
        <div className="product-icon-fallback">
          <Icon name={iconKey} />
        </div>
        <span className={`product-badge${soldOut ? " out" : ""}`}>{badgeLabel}</span>
      </div>
      <div className="product-body">
        {showFlags ? (
          <div className="product-card-flags">
            {typeVisible ? <span className="product-type-label">{productType}</span> : null}
            {featured ? <span className="product-featured-label">Featured</span> : null}
          </div>
        ) : null}
        <h3>{p.name}</h3>
        {price ? <span className="product-price">From {price}</span> : null}
        <p>{p.description || ""}</p>
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
            href={waHref}
            className="product-order-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              soldOut
                ? `Enquire on WhatsApp about ${p.name}`
                : `Order ${p.name} on WhatsApp`
            }
          >
            <WaIcon />
            <span>{orderText}</span>
          </a>
          <button
            type="button"
            className="product-share-btn js-share"
            data-slug={slug}
            aria-label={`Copy link to ${p.name}`}
            title="Copy product link"
            onClick={copyProductLink}
          >
            <Icon name="link" />
          </button>
        </div>
      </div>
    </div>
  );
}

export async function copyProductLink(event) {
  const btn = event?.currentTarget;
  const slug = btn?.getAttribute("data-slug");
  const text = `${window.location.origin}/product/${encodeURIComponent(slug || "")}`;
  const ariaLabel = btn?.getAttribute("aria-label");
  const showCopied = () => {
    btn?.classList.add("copied");
    btn?.setAttribute("aria-label", "Link copied");
    setTimeout(() => {
      btn?.classList.remove("copied");
      if (ariaLabel) btn?.setAttribute("aria-label", ariaLabel);
    }, 2000);
  };
  try {
    await navigator.clipboard.writeText(text);
    showCopied();
  } catch (err) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showCopied();
    } catch (e2) {}
    document.body.removeChild(ta);
  }
}
