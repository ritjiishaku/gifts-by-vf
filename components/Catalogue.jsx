"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductCard, orderMessage } from "./ProductCard";
import { Lightbox } from "./Lightbox";
import { WaIcon } from "./icons";
import {
  priceNumber,
  slugify,
  isFeatured,
} from "@/lib/format";
import {
  taxonomyCategoryForProduct,
  taxonomySubcategoryForProduct,
  taxonomyProductTypeForProduct,
  taxonomyProductTypes,
} from "@/lib/taxonomy";
import { subscribeReferral, getReferral } from "./referral-store";
import { waLink } from "@/lib/site";

const PRODUCT_LIMIT = 12;
const CATEGORY_PRODUCT_LIMIT = 6;
const CATEGORY_PRODUCT_CHUNK = 6;

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1113.5 9.5 4.5 4.5 0 019 14z" />
  </svg>
);

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

export function Catalogue({ products, taxonomy, settings }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSubcategory, setActiveSubcategory] = useState("all");
  const [activeProductType, setActiveProductType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const [shownByGroup, setShownByGroup] = useState({});
  const [ref, setRef] = useState(getReferral);
  const searchTimer = useRef(null);

  useEffect(() => {
    setRef(getReferral());
    return subscribeReferral(() => setRef(getReferral()));
  }, []);

  const allProducts = useMemo(() => products || [], [products]);

  const isFilteredView = () =>
    activeCategory !== "all" ||
    activeSubcategory !== "all" ||
    activeProductType !== "all" ||
    String(searchQuery || "").trim() !== "";

  const matchesFilters = useCallback(
    (p) => {
      if (activeCategory !== "all") {
        const cat = taxonomyCategoryForProduct(p, taxonomy);
        if (!cat || cat.name.toLowerCase() !== activeCategory) return false;
      }
      if (activeSubcategory !== "all") {
        if (taxonomySubcategoryForProduct(p, taxonomy).toLowerCase() !== activeSubcategory) return false;
      }
      if (activeProductType !== "all") {
        if (taxonomyProductTypeForProduct(p, taxonomy).toLowerCase() !== activeProductType) return false;
      }
      const q = String(searchQuery || "").toLowerCase();
      if (q) {
        const haystack = [
          p.name,
          p.description,
          p.category,
          p.subcategory,
          p.product_type,
          taxonomyCategoryForProduct(p, taxonomy)?.name,
          taxonomySubcategoryForProduct(p, taxonomy),
          taxonomyProductTypeForProduct(p, taxonomy),
          p.occasion,
          p.material,
          p.size,
          p.price,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    },
    [activeCategory, activeSubcategory, activeProductType, searchQuery, taxonomy]
  );

  const filtered = useMemo(() => {
    let list = allProducts.filter(matchesFilters);
    if (sort === "price-asc" || sort === "price-desc") {
      const dir = sort === "price-asc" ? 1 : -1;
      list = list.slice().sort((a, b) => {
        const pa = priceNumber(a);
        const pb = priceNumber(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return dir * (pa - pb);
      });
    } else if (sort === "name-asc") {
      list = list.slice().sort((a, b) => {
        const na = (a.name || "").trim().toLowerCase();
        const nb = (b.name || "").trim().toLowerCase();
        if (!na && !nb) return 0;
        if (!na) return 1;
        if (!nb) return -1;
        return na < nb ? -1 : na > nb ? 1 : 0;
      });
    }
    return list;
  }, [allProducts, matchesFilters, sort]);

  useEffect(() => setShownByGroup({}), [filtered]);

  const clearFilters = useCallback(() => {
    setActiveCategory("all");
    setActiveSubcategory("all");
    setActiveProductType("all");
    setSearchQuery("");
  }, []);

  useEffect(() => {
    const onClear = () => clearFilters();
    window.addEventListener("vf:clear-filters", onClear);
    return () => window.removeEventListener("vf:clear-filters", onClear);
  }, [clearFilters]);

  // Preserved deep link: /?p=<slug>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("p");
    if (!p) return;
    const target = allProducts.find(
      (product) => product.slug === slugify(p) || slugify(product.name) === slugify(p)
    );
    if (!target) return;
    clearFilters();
    const category = taxonomyCategoryForProduct(target, taxonomy);
    if (category) {
      const group = taxonomySubcategoryForProduct(target, taxonomy);
      const groupKey =
        category.subcategories && Array.isArray(category.subcategories) && category.subcategories.length
          ? `${slugify(category.name)}-${slugify(group)}`
          : slugify(category.name);
      setShownByGroup((prev) => ({
        ...prev,
        [groupKey]: allProducts.filter((product) => {
          if (taxonomyCategoryForProduct(product, taxonomy)?.name !== category.name) return false;
          if (!category.subcategories || !category.subcategories.length) return true;
          return taxonomySubcategoryForProduct(product, taxonomy).toLowerCase() === group.toLowerCase();
        }).length,
      }));
    }
    setTimeout(() => {
      const el = document.getElementById(`product-${target.slug || slugify(target.name)}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("highlighted");
        setTimeout(() => el.classList.remove("highlighted"), 2500);
      }
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryBrowseLabel = () => {
    if (!taxonomy || !taxonomy.length || activeCategory === "all") return "";
    const category = taxonomy.find((item) => item.name.toLowerCase() === activeCategory);
    if (!category) return "";
    const parts = [category.name];
    if (activeSubcategory !== "all") {
      const group = (category.subcategories || []).find(
        (item) => item.name.toLowerCase() === activeSubcategory
      );
      if (group) parts.push(group.name);
    }
    if (activeProductType !== "all") {
      const option = taxonomyProductTypes(category).find(
        (item) => item.name.toLowerCase() === activeProductType
      );
      if (option) parts.push(option.name);
    }
    return parts.join(" — ");
  };

  const categoryInquiryLink = (context) => {
    let message = `Hello! I'd like to enquire about ${context} from your catalogue.`;
    if (ref && ref.name) message += ` I was referred by ${ref.name}.`;
    return waLink(settings, message);
  };

  const selectedCategory = taxonomy && taxonomy.length ? taxonomy.find((c) => c.name.toLowerCase() === activeCategory) : undefined;
  const selectionPieces = selectedCategory ? [selectedCategory.name] : [];
  if (selectedCategory && activeSubcategory !== "all") {
    const group = (selectedCategory.subcategories || []).find(
      (item) => item.name.toLowerCase() === activeSubcategory
    );
    if (group) selectionPieces.push(group.name);
  }
  if (selectedCategory && activeProductType !== "all") {
    const product = taxonomyProductTypes(selectedCategory).find(
      (item) => item.name.toLowerCase() === activeProductType
    );
    if (product) selectionPieces.push(product.name);
  }
  const selectionText = selectedCategory ? `Browsing: ${selectionPieces.join(" · ")}` : "";

  const catalogueCountText = (displayed, matching) => {
    const total = allProducts.length;
    const productWord = total === 1 ? "product" : "products";
    if (isFilteredView()) {
      const matchingWord = matching === 1 ? "product" : "products";
      return `Showing ${displayed} of ${matching} matching ${matchingWord} · ${total} ${productWord} in catalogue`;
    }
    return `Showing ${displayed} of ${total} ${productWord}`;
  };

  const categories = Array.isArray(taxonomy) && taxonomy.length ? taxonomy : [];
  const grouped = categories.length === 4;

  const renderCard = (product, pid) => (
    <ProductCard
      key={product.id}
      p={product}
      pid={pid}
      settings={settings}
      taxonomy={taxonomy}
      ref={ref}
    />
  );

  const renderCategoryProductCards = (groupProducts, groupKey) => {
    const ordered = groupProducts.slice();
    if (sort === "featured") {
      ordered.sort(
        (a, b) =>
          Number(isFeatured(b)) - Number(isFeatured(a)) ||
          (parseInt(a.display_order, 10) || 999) - (parseInt(b.display_order, 10) || 999)
      );
    }
    const shownCount = Math.min(shownByGroup[groupKey] || CATEGORY_PRODUCT_LIMIT, ordered.length);
    const visible = ordered.slice(0, shownCount);
    const remaining = ordered.length - shownCount;
    const more =
      remaining > 0 ? (
        <button
          type="button"
          className="load-more category-load-more"
          onClick={() =>
            setShownByGroup((prev) => ({
              ...prev,
              [groupKey]: (prev[groupKey] || CATEGORY_PRODUCT_LIMIT) + CATEGORY_PRODUCT_CHUNK,
            }))
          }
        >
          {`Show ${Math.min(CATEGORY_PRODUCT_CHUNK, remaining)} more (${remaining} left) `}
          <span aria-hidden="true">↓</span>
        </button>
      ) : null;
    return {
      node: (
        <div className="products-grid category-products-grid">
          {visible.map((product, index) =>
            renderCard(product, product.display_order || index + 1)
          )}
          {more}
        </div>
      ),
      visibleCount: visible.length,
    };
  };

  const renderProductTypeMenu = (types, label) => {
    if (!types || !types.length) return null;
    return (
      <details className="catalogue-type-menu">
        <summary>View {label}</summary>
        <div>
          {types.map((type) => (
            <span key={type.name}>{type.name}</span>
          ))}
        </div>
      </details>
    );
  };

  const renderCategoryEnquiry = (category, group) => {
    const context = group ? `${category.name} — ${group.name}` : category.name;
    return (
      <div className="category-enquiry-panel">
        <div>
          <strong>Made for your moment</strong>
          <p>Explore {context} styles or ask us to create the right piece for you.</p>
          {renderProductTypeMenu(group ? group.productTypes : taxonomyProductTypes(category), `${context} styles`)}
        </div>
        <a
          className="product-order-btn"
          href={categoryInquiryLink(context)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <WaIcon />
          <span>Ask us on WhatsApp</span>
        </a>
      </div>
    );
  };

  const renderGrid = () => {
    let visibleCount = 0;
    let sections;

    if (!grouped) {
      if (filtered.length === 0) {
        return emptyState("No products match your current search.");
      }
      const shown = Math.min(PRODUCT_LIMIT, filtered.length);
      const remaining = filtered.length - shown;
      sections = (
        <>
          {filtered.slice(0, shown).map((product, index) =>
            renderCard(product, product.display_order || index + 1)
          )}
          {remaining > 0 ? (
            <div className="load-more-wrap">
              <button
                type="button"
                className="load-more"
                onClick={() => setShownByGroup((prev) => ({ ...prev, flat: PRODUCT_LIMIT }))}
              >
                {`Show more (${remaining} more)`}
              </button>
            </div>
          ) : null}
        </>
      );
      visibleCount = shown;
      return { sections, count: catalogueCountText(shown, filtered.length) };
    }

    const chunks = categories.map((category, index) => {
      const categoryProducts = filtered.filter(
        (product) => taxonomyCategoryForProduct(product, taxonomy)?.name === category.name
      );
      if (isFilteredView() && categoryProducts.length === 0) return null;

      const groups = category.subcategories || [];
      let content;
      if (groups.length) {
        content = groups.map((group) => {
          const groupProducts = categoryProducts.filter(
            (product) =>
              taxonomySubcategoryForProduct(product, taxonomy).toLowerCase() === group.name.toLowerCase()
          );
          if (isFilteredView() && groupProducts.length === 0) return null;
          const groupKey = `${slugify(category.name)}-${slugify(group.name)}`;
          const typeMenu = renderProductTypeMenu(group.productTypes || [], `${group.name} styles`);
          const productContent = groupProducts.length
            ? (() => {
                const rendered = renderCategoryProductCards(groupProducts, groupKey);
                visibleCount += rendered.visibleCount;
                return rendered.node;
              })()
            : renderCategoryEnquiry(category, group);
          return (
            <section key={group.name} className="catalogue-subsection">
              <div className="catalogue-subsection-heading">
                <div>
                  <p className="subsection-kicker">{category.name}</p>
                  <h3>{group.name}</h3>
                  <p>
                    {groupProducts.length
                      ? `${groupProducts.length} ${groupProducts.length === 1 ? "piece" : "pieces"} in this group`
                      : "Made-to-order styles available"}
                  </p>
                </div>
                {typeMenu}
              </div>
              {productContent}
            </section>
          );
        });
      } else {
        const typeMenu = renderProductTypeMenu(category.productTypes || [], `${category.name} styles`);
        content = categoryProducts.length
          ? (() => {
              const rendered = renderCategoryProductCards(categoryProducts, slugify(category.name));
              visibleCount += rendered.visibleCount;
              return (
                <>
                  <div className="catalogue-category-toolbar">{typeMenu}</div>
                  {rendered.node}
                </>
              );
            })()
          : renderCategoryEnquiry(category, null);
      }

      const countLabel = categoryProducts.length
        ? `${categoryProducts.length} listed ${categoryProducts.length === 1 ? "piece" : "pieces"}`
        : `${taxonomyProductTypes(category).length} styles to explore`;

      return (
        <section
          key={category.name}
          className="catalogue-category-section"
          id={`category-${slugify(category.name)}`}
        >
          <header className="catalogue-category-heading">
            <div className="category-heading-copy">
              <p className="category-section-kicker">COLLECTION 0{index + 1}</p>
              <h2>{category.name}</h2>
              <p>{category.description || ""}</p>
              <span className="category-section-count">{countLabel}</span>
            </div>
            <div className="category-heading-visual" aria-hidden="true">
              <span>0{index + 1}</span>
              <i>GIFT COLLECTION</i>
            </div>
          </header>
          <div className="catalogue-category-content">{content}</div>
        </section>
      );
    });

    const rendered = chunks.filter(Boolean);
    if (rendered.length === 0) {
      const context = categoryBrowseLabel();
      const message = context
        ? `We don't have a listed piece for ${context} right now, but it may be available as a custom order.`
        : "No products match your current search and filters.";
      return emptyState(message, context);
    }

    return { sections: rendered, count: catalogueCountText(visibleCount, filtered.length) };
  };

  const emptyState = (message, context) => {
    const waHref = waLink(settings, orderMessage(null, null, ref));
    return {
      sections: (
        <div className="empty-state category-empty-state">
          <p>{message}</p>
          <a
            className="product-order-btn"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ask Gifts by VF about ${context || "a gift"}`}
          >
            <WaIcon />
            <span>{context ? "Ask us about this" : "Ask us on WhatsApp"}</span>
          </a>
        </div>
      ),
      count: catalogueCountText(0, 0),
    };
  };

  const { sections, count } = renderGrid();

  return (
    <>
      <Lightbox />
      <div className="catalogue-header fade-in">
        <p className="section-label" id="products-label">{settings.products_label}</p>
        <h2 className="section-title" id="products-title">{settings.products_title}</h2>
        <p className="section-desc" id="products-desc">{settings.products_desc}</p>
        <div className="category-selection" id="category-selection" role="status" aria-live="polite" hidden={!selectionText}>
          <span id="category-selection-text">{selectionText}</span>
        </div>
      </div>
      <div className="catalogue-controls fade-in">
        <div className="catalogue-search">
          {SEARCH_ICON}
          <input
            type="search"
            id="catalogue-search"
            placeholder="Search by name, category, occasion or keyword…"
            aria-label="Search products"
            defaultValue={searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              clearTimeout(searchTimer.current);
              searchTimer.current = setTimeout(() => setSearchQuery(value.trim()), 150);
            }}
          />
          <button
            type="button"
            id="catalogue-search-clear"
            className="search-clear"
            aria-label="Clear search"
            title="Clear search"
            onClick={() => setSearchQuery("")}
          >
            {CLOSE_ICON}
          </button>
        </div>
        <div className="catalogue-selects">
          <select
            id="catalogue-sort"
            className="catalogue-sort"
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value || "featured")}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
          </select>
        </div>
        <p className="catalogue-count" id="catalogue-count" aria-live="polite">
          {count}
        </p>
      </div>
      <div className="products-grid" id="products-grid">
        {sections}
      </div>
    </>
  );
}
