"use client";

import { validateUrl, directImageUrl, srcVariant } from "@/lib/format";
import { openLightbox } from "./Lightbox";
import { Icon } from "./icons";

export function Portfolio({ label, title, rows }) {
  if (!rows || rows.length === 0) return null;

  return (
    <section id="portfolio" className="side-section fade-in">
      <div className="section-inner">
        <div className="catalogue-header">
          <p className="section-label" id="portfolio-label">{label}</p>
          <h2 className="section-title" id="portfolio-title">{title}</h2>
        </div>
        <div className="portfolio-grid fade-in" id="portfolio-grid">
          {rows.map((row, i) => {
            const url = validateUrl(directImageUrl(row.image_url));
            const caption = String(row.caption || "").trim();
            const labelText = caption || "Portfolio piece";
            const wide = isWide(row);
            return (
              <div key={`${labelText}-${i}`} className={`portfolio-item${wide ? " wide" : ""} fade-in`}>
                {row.icon ? (
                  <span className="portfolio-icon" aria-hidden="true">
                    <Icon name={String(row.icon).trim().toLowerCase()} />
                  </span>
                ) : null}
                {url ? (
                  <>
                    <button
                      type="button"
                      className="js-lightbox"
                      aria-label={`View ${labelText}`}
                      onClick={() => openLightbox({ url, name: labelText })}
                    >
                      <img
                        src={url}
                        srcSet={`${srcVariant(url, 480, 360)} 480w, ${srcVariant(url, 960, 720)} 960w`}
                        sizes="(min-width: 768px) 360px, 100vw"
                        alt={labelText}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.dataset.retried) {
                            img.dataset.retried = "true";
                            img.src = url;
                          } else {
                            img.closest(".portfolio-item")?.classList.add("no-image");
                            img.closest(".js-lightbox")?.style.setProperty("display", "none");
                          }
                        }}
                      />
                    </button>
                    {caption ? <span className="portfolio-caption">{caption}</span> : null}
                  </>
                ) : (
                  <span className="portfolio-caption only">{labelText}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function isWide(row) {
  if (typeof row.is_wide === "boolean") return row.is_wide;
  const v = String((row && (row.is_wide != null ? row.is_wide : row.wide)) || "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
