"use client";

import {
  slugify,
  validateUrl,
  directImageUrl,
  siteImageUrl,
  videoUrl,
  isDriveUrl,
  isFeatured,
} from "@/lib/format";
import { taxonomyCategoryForProduct } from "@/lib/taxonomy";
import { SiteImage } from "./SiteImage";

export function CategoryExplorer({ taxonomy, products, settings }) {
  if (!Array.isArray(taxonomy) || taxonomy.length !== 4) return null;

  const handleJump = () => {
    window.dispatchEvent(new CustomEvent("vf:clear-filters"));
  };

  return taxonomy.map((category, index) => {
    const categoryProducts = (products || []).filter(
      (product) => taxonomyCategoryForProduct(product)?.name === category.name
    );
    const imageProduct = categoryProducts
      .slice()
      .sort((a, b) => Number(isFeatured(b)) - Number(isFeatured(a)))
      .find(
        (product) =>
          product.image_url &&
          (!videoUrl(product.image_url) || isDriveUrl(product.image_url))
      );
    const configuredImage = siteImageUrl(settings[category.imageSettingKey]);
    const productImage = imageProduct
      ? validateUrl(directImageUrl(imageProduct.image_url))
      : "";
    const image = configuredImage || productImage;
    const coverFallback =
      configuredImage && productImage && configuredImage !== productImage
        ? productImage
        : "";
    const count = categoryProducts.length;
    const sectionId = `category-${slugify(category.name)}`;

    const onImgError = (event) => {
      const img = event.currentTarget;
      if (coverFallback && !img.dataset.didFallback) {
        img.dataset.didFallback = "1";
        img.src = coverFallback;
      } else {
        img.style.display = "none";
      }
    };

    return (
      <a
        key={category.name}
        className="category-card"
        style={{ "--i": index }}
        href={`#${sectionId}`}
        data-category-jump={sectionId}
        aria-label={`View ${category.name} gifts`}
        onClick={handleJump}
      >
        <span className="category-card-media">
          <span
            className={`category-card-placeholder category-placeholder-${index + 1}`}
            aria-hidden="true"
          >
            <span>{`0${index + 1}`}</span>
            <i>Gifts by VF</i>
          </span>
          {image ? (
            <SiteImage
              src={image}
              alt=""
              sizes="(min-width: 768px) 25vw, 50vw"
              legacyWidths={[400, 800, 1200]}
              onError={onImgError}
            />
          ) : null}
          <span className="category-card-overlay"></span>
        </span>
        <span className="category-card-content">
          <strong>{category.name}</strong>
          <span className="category-card-action">
            {count > 0 ? (
              <span className="category-card-count">
                {`${count} gift${count === 1 ? "" : "s"}`}
              </span>
            ) : null}
            <span className="category-card-action-label">
              View gifts <b aria-hidden="true">→</b>
            </span>
          </span>
        </span>
      </a>
    );
  });
}
