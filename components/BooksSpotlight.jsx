"use client";

import { isFeatured, slugify } from "@/lib/format";
import { taxonomyCategoryForProduct } from "@/lib/taxonomy";
import { ProductCard } from "./ProductCard";
import { WaCta } from "./WaCta";

const BOOKS_SPOTLIGHT_LIMIT = 3;

export function BooksSpotlight({ settings, products, taxonomy }) {
  const booksCategory = (taxonomy || []).find((category) => category.name === "Books");
  if (!booksCategory) return null;

  const books = (products || [])
    .filter((product) => taxonomyCategoryForProduct(product, taxonomy)?.name === "Books")
    .slice()
    .sort(
      (a, b) =>
        Number(isFeatured(b)) - Number(isFeatured(a)) ||
        (parseInt(a.display_order, 10) || 999) - (parseInt(b.display_order, 10) || 999)
    )
    .slice(0, BOOKS_SPOTLIGHT_LIMIT);

  if (!books.length) return null;

  const browseHref = `#category-${slugify(booksCategory.name)}`;

  const handleBrowse = (event) => {
    window.dispatchEvent(new CustomEvent("vf:clear-filters"));
    event?.preventDefault?.();
    requestAnimationFrame(() => {
      window.location.hash = browseHref;
    });
  };

  return (
    <section id="books" className="books-spotlight" aria-labelledby="books-title">
      <div className="section-inner">
        <div className="catalogue-header fade-in">
          {settings.books_label ? (
            <p className="section-label" id="books-label">
              {settings.books_label}
            </p>
          ) : null}
          <h2 className="section-title" id="books-title">
            {settings.books_title}
          </h2>
          {settings.books_partner ? <p className="books-partner">{settings.books_partner}</p> : null}
          {settings.books_desc ? <p className="section-desc">{settings.books_desc}</p> : null}
        </div>
        <div className="products-grid books-spotlight-grid">
          {books.map((product, index) => (
            <ProductCard
              key={product.id}
              p={product}
              pid={product.display_order || index + 1}
              settings={settings}
              taxonomy={taxonomy}
            />
          ))}
        </div>
        <div className="books-spotlight-cta">
          <a
            className="product-order-btn"
            href={browseHref}
            data-category-jump={`category-${slugify(booksCategory.name)}`}
            onClick={handleBrowse}
          >
            <span>{settings.books_browse_label || "Browse all books"}</span>
          </a>
          <WaCta
            settings={settings}
            className="product-order-btn"
            label={settings.books_cta_label || "Ask about our books"}
            ariaLabel="Ask Gifts by VF about our books on WhatsApp"
            message="Hello! I'd like to ask about the books you have available."
          />
        </div>
      </div>
    </section>
  );
}
