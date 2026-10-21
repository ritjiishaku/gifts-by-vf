"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatNaira } from "@/lib/format";
import { TAXONOMY, taxonomyCategoryForProduct } from "@/lib/taxonomy";

// Searchable catalogue picker for the admin order form.
//
// - The value is ALWAYS an exact catalogue product name, unless the owner
//   ticks "Use a custom product name".
// - Typing filters the list; tapping a row (or typing the exact name)
//   selects that product.
// - Category chips narrow the list to one of the 4 taxonomy categories.
//
// Mobile-first: the result list sits in the normal flow (so the on-screen
// keyboard never covers it) and scrolls inside a capped-height panel; from
// 768px up it becomes an overlay so the rest of the form does not jump.
//
// Props:
//   products       - catalogue rows
//   value          - current product name ("" when nothing is selected)
//   onChange       - (name) => void, called with the typed / selected name
//   custom         - boolean: the owner is typing a free-text name
//   onCustomChange - (bool) => void
export function ProductPicker({
  products = [],
  value = "",
  onChange,
  custom = false,
  onCustomChange,
}) {
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Every product with its normalised category and display price.
  const entries = useMemo(
    () =>
      (products || []).map((p) => ({
        product: p,
        key: String(p.name || "").trim().toLowerCase(),
        category: taxonomyCategoryForProduct(p)?.name || "More to Love",
        priceLabel: formatNaira(p.price) || "No price set",
      })),
    [products]
  );

  const byName = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      if (!map.has(e.key)) map.set(e.key, e.product);
    });
    return map;
  }, [entries]);

  const text = String(value || "").trim();
  const exact = text ? byName.get(text.toLowerCase()) || null : null;

  const matches = useMemo(() => {
    const q = text.toLowerCase();
    return entries.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return e.key.includes(q) || e.category.toLowerCase().includes(q);
    });
  }, [entries, text, category]);

  // Close the list when the owner taps outside the picker. A pointerdown
  // listener (not onBlur) keeps taps on a result working on touch screens.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const pick = (p) => {
    onChange?.(String(p.name || ""));
    setOpen(false);
  };

  return (
    <div className="admin-field admin-field-wide" ref={wrapRef}>
      <span className="admin-field-label">Product *</span>

      {custom ? (
        <input
          type="text"
          name="product"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Type the product name"
          className="admin-product-input"
          autoComplete="off"
          required
        />
      ) : (
        <div className="admin-product-picker">
          <input
            type="text"
            name="product"
            value={value}
            onChange={(e) => {
              onChange?.(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search the catalogue…"
            className="admin-product-input"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            required
          />

          <div className="admin-product-filters" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`admin-product-chip${category === "all" ? " is-active" : ""}`}
              onClick={() => setCategory("all")}
            >
              All
            </button>
            {TAXONOMY.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`admin-product-chip${category === c.name ? " is-active" : ""}`}
                onClick={() => setCategory(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>

          {open ? (
            <div className="admin-product-list" role="listbox" aria-label="Catalogue products">
              {matches.map((e) => (
                <button
                  key={e.product.id ?? e.key}
                  type="button"
                  role="option"
                  aria-selected={Boolean(exact && exact.id === e.product.id)}
                  className={`admin-product-option${
                    exact && exact.id === e.product.id ? " is-selected" : ""
                  }`}
                  onClick={() => pick(e.product)}
                >
                  <span className="admin-product-option-name">{e.product.name}</span>
                  <span className="admin-product-option-meta">
                    <span className="admin-product-badge">{e.category}</span>
                    <span className="admin-product-price">{e.priceLabel}</span>
                  </span>
                </button>
              ))}
              {matches.length === 0 ? (
                <p className="admin-product-empty">
                  No catalogue product matches{text ? ` “${text}”` : " your search"}. Tick “Use a
                  custom product name” to record it anyway.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <label className="admin-check admin-product-custom">
        <input
          type="checkbox"
          checked={custom}
          onChange={(e) => onCustomChange?.(e.target.checked)}
        />
        Use a custom product name (not in the catalogue)
      </label>

      <span className="admin-field-hint">
        {custom
          ? "Saved exactly as typed — there is no catalogue price to fill in."
          : exact
            ? "✓ Exact catalogue match — the price and commission fill in automatically."
            : "Pick a product from the list so the price and commission fill in automatically."}
      </span>
    </div>
  );
}
