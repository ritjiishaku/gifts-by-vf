"use client";

import { useEffect, useMemo, useState } from "react";
import {
  slugify,
  priceNumber,
  formatNaira,
  isSoldOut,
  directImageUrl,
  validateUrl,
} from "@/lib/format";

const REP_PAYOUT_LIMIT = 5;
const REP_CREDIT_WINDOW_DAYS = 30;
const SESSION_KEY = "vf_rep_session";

export function RepPortal({ products, commissionRule }) {
  const [step, setStep] = useState("login");
  const [rep, setRep] = useState(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payouts, setPayouts] = useState(null);
  const [payoutsError, setPayoutsError] = useState("");
  const [payoutShown, setPayoutShown] = useState(REP_PAYOUT_LIMIT);
  const [filter, setFilter] = useState({ query: "", category: "all", price: "any", occasion: "all", sort: "featured" });

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) setInput(saved);
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setError("");
    const id = input.trim();
    if (!id) {
      setError("Please enter your rep code.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reps?rep=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (res.status === 404) {
        setError("That rep code was not found. Check with the owner.");
        return;
      }
      if (!res.ok) throw new Error("login failed");
      const json = await res.json();
      const found = json.rep || {};
      setRep({ rep_id: found.rep_id, name: found.name, rate: found.commission_rate });
      setPayoutsError("");
      setPayouts(Array.isArray(json.payouts) ? json.payouts : []);
      sessionStorage.setItem(SESSION_KEY, found.rep_id);
      setStep("dashboard");
    } catch (err) {
      setError("Could not sign you in right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setRep(null);
    setPayouts(null);
    setStep("login");
    setInput("");
  };

  const rateText = useMemo(() => {
    const raw = String(rep?.rate ?? "").trim();
    if (/^\d+(\.\d+)?$/.test(raw)) return parseFloat(raw) + "%";
    if (!raw.endsWith("%")) return raw ? raw + "%" : "—";
    return raw;
  }, [rep]);

  const ruleText = useMemo(
    () =>
      commissionRule ||
      `Commission is ${rateText} of the product's catalogue price, excluding delivery.`,
    [commissionRule, rateText]
  );

  const categories = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => {
      const c = String(p.category || "").trim();
      if (c) map.set(c.toLowerCase(), c);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const occasions = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) =>
      String(p.occasion || "")
        .split(",")
        .forEach((t) => {
          t = t.trim();
          if (t) map.set(t.toLowerCase(), t);
        })
    );
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = String(filter.query || "").trim().toLowerCase();
    let list = (products || []).filter((p) => {
      if (filter.category !== "all" && String(p.category || "").trim().toLowerCase() !== filter.category) return false;
      if (filter.occasion !== "all") {
        const tags = String(p.occasion || "").toLowerCase().split(",").map((v) => v.trim());
        if (!tags.includes(filter.occasion)) return false;
      }
      if (filter.price !== "any") {
        const price = priceNumber(p);
        if (price == null) return false;
        if (filter.price === "under-20000" && !(price < 20000)) return false;
        if (filter.price === "20000-50000" && !(price >= 20000 && price <= 50000)) return false;
        if (filter.price === "above-50000" && !(price > 50000)) return false;
      }
      if (q) {
        const searchable = [p.name, p.description, p.category, p.material, p.size, p.price].join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
    if (filter.sort === "price-asc" || filter.sort === "price-desc") {
      const direction = filter.sort === "price-asc" ? 1 : -1;
      list = list.slice().sort((a, b) => {
        const pa = priceNumber(a);
        const pb = priceNumber(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return direction * (pa - pb);
      });
    } else if (filter.sort === "name-asc") {
      list = list.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }
    return list;
  }, [products, filter]);

  const estimatedCommission = (p) => {
    const rate = parseFloat(String(rep?.rate ?? "").replace("%", ""));
    if (!Number.isFinite(rate) || rate <= 0) return "";
    const price = priceNumber(p);
    if (price == null || price <= 0) return "";
    return "≈ ₦" + Math.round((price * rate) / 100).toLocaleString() + " commission";
  };

  const shareLink = (pid) =>
    `${window.location.origin}/product/${encodeURIComponent(pid)}?ref=${encodeURIComponent(rep.rep_id)}`;

  const copyText = async (text, btn) => {
    const original = btn.textContent;
    const done = () => {
      btn.classList.add("copied");
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = original;
      }, 2000);
    };
    try {
      await navigator.clipboard.writeText(text);
      done();
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e2) {}
      document.body.removeChild(ta);
    }
  };

  if (step === "login") {
    return (
      <section id="rep-login" className="rep-section rep-panel">
        <h2>Sales Rep Login</h2>
        <p className="rep-hint">
          Enter the rep code the owner gave you (for example, <strong>kofi</strong>). You&apos;ll
          get your personalised share links and commission status.
        </p>
        <form id="rep-form" className="rep-form" onSubmit={login}>
          <input
            type="text"
            id="rep-input"
            placeholder="Enter your rep code"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="rep-btn" disabled={submitting}>
            {submitting ? "Checking…" : "Continue"}
          </button>
        </form>
        <p id="rep-error" className={`rep-error${error ? "" : " hidden"}`}>{error}</p>
      </section>
    );
  }

  const mine = (payouts || []).filter(
    (r) => String(r.rep_id || "").trim().toLowerCase() === String(rep.rep_id).toLowerCase()
  );
  const pendingTotal = mine.reduce(
    (sum, r) => sum + (String(r.status || "").toLowerCase() === "paid" ? 0 : parseFloat(r.commission) || 0),
    0
  );
  const paidTotal = mine.reduce(
    (sum, r) => sum + (String(r.status || "").toLowerCase() === "paid" ? parseFloat(r.commission) || 0 : 0),
    0
  );
  const naira = (n) => "₦" + Math.round(n).toLocaleString();
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const productCountText =
    payouts === undefined
      ? ""
      : `${products.length} ${products.length === 1 ? "product" : "products"} in catalogue · ${filteredProducts.length} ${
          filteredProducts.length === 1 ? "product matches" : "products match"
        } your filters`;

  const payoutSummary = (() => {
    if (payoutsError) return "";
    if (mine.length === 0) {
      return "No commissions recorded yet. Sales you refer will appear here once the owner confirms them.";
    }
    const saleLabel = mine.length === 1 ? "sale" : "sales";
    return `${mine.length} ${saleLabel} · Pending: ${naira(pendingTotal)} · Paid: ${naira(paidTotal)}`;
  })();

  return (
    <section id="rep-dashboard" className="rep-dashboard">
      <div className="rep-dashboard-intro">
        <div>
          <p className="section-label">Sales portal</p>
          <h2>Welcome back, <span id="rep-name">{rep.name || rep.rep_id}</span></h2>
          <p>Find a gift to share or check your latest commission activity.</p>
        </div>
        <button id="rep-logout" className="rep-btn rep-logout" type="button" onClick={logout}>
          Start over
        </button>
      </div>

      <div className="rep-dashboard-layout">
        <aside className="rep-earnings-sidebar" aria-label="Your earnings">
          <div className="rep-earnings-card">
            <p className="section-label">Your performance</p>
            <h3>Commission overview</h3>
            <div className="rep-stats" id="rep-stats" aria-label="Commission summary">
              <div className="rep-stat">
                <span className="rep-stat-num" id="rep-stat-rate">{rateText}</span>
                <span className="rep-stat-label">Commission rate</span>
              </div>
              <div className="rep-stat">
                <span className="rep-stat-num" id="rep-stat-sales">{mine.length}</span>
                <span className="rep-stat-label">Confirmed sales</span>
              </div>
              <div className="rep-stat">
                <span className="rep-stat-num" id="rep-stat-pending">{naira(pendingTotal)}</span>
                <span className="rep-stat-label">Pending</span>
              </div>
              <div className="rep-stat">
                <span className="rep-stat-num" id="rep-stat-paid">{naira(paidTotal)}</span>
                <span className="rep-stat-label">Paid</span>
              </div>
            </div>
            <p id="rep-rule" className="rep-hint">{ruleText}</p>
            <p id="rep-credit" className="rep-hint">
              Any order placed through your links within {REP_CREDIT_WINDOW_DAYS} days of the
              buyer&apos;s first click is credited to you.
            </p>
            <a className="rep-history-link" href="#rep-commission-history" id="rep-history-link">
              View payout history <span aria-hidden="true">→</span>
            </a>
          </div>
        </aside>

        <section className="rep-catalogue-panel" aria-labelledby="rep-products-title">
          <div className="rep-catalogue-heading">
            <p className="section-label">Product catalogue</p>
            <h3 id="rep-products-title">Your product links</h3>
            <p className="rep-hint">
              Copy a link and share it on WhatsApp, Instagram, or Facebook. Orders through your
              link earn you commission.
            </p>
          </div>
          <div className="rep-catalogue-toolbar">
            <div className="rep-catalogue-toolbar-row">
              <p id="rep-product-count" className="rep-product-count" role="status" aria-live="polite">
                {productCountText}
              </p>
              <label className="rep-filter-field rep-filter-search">
                <span>Search products</span>
                <input
                  type="search"
                  id="rep-product-search"
                  placeholder="Search by name, description, or material"
                  autoComplete="off"
                  value={filter.query}
                  onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
                />
              </label>
            </div>
            <details id="rep-product-filter-details" className="rep-filter-details" open>
              <summary>Filters and sorting</summary>
              <div className="rep-catalogue-controls" aria-label="Filter product links">
                <label className="rep-filter-field">
                  <span>Category</span>
                  <select
                    id="rep-product-category"
                    value={filter.category}
                    onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="all">All categories</option>
                    {categories.map((c) => (
                      <option key={c.toLowerCase()} value={c.toLowerCase()}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="rep-filter-field">
                  <span>Price</span>
                  <select
                    id="rep-product-price"
                    value={filter.price}
                    onChange={(e) => setFilter((f) => ({ ...f, price: e.target.value }))}
                  >
                    <option value="any">Any price</option>
                    <option value="under-20000">Under ₦20,000</option>
                    <option value="20000-50000">₦20,000–₦50,000</option>
                    <option value="above-50000">Above ₦50,000</option>
                  </select>
                </label>
                <label className="rep-filter-field">
                  <span>Occasion</span>
                  <select
                    id="rep-product-occasion"
                    value={filter.occasion}
                    onChange={(e) => setFilter((f) => ({ ...f, occasion: e.target.value }))}
                  >
                    <option value="all">All occasions</option>
                    {occasions.map((o) => (
                      <option key={o.toLowerCase()} value={o.toLowerCase()}>{o}</option>
                    ))}
                  </select>
                </label>
                <label className="rep-filter-field">
                  <span>Sort by</span>
                  <select
                    id="rep-product-sort"
                    value={filter.sort}
                    onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value }))}
                  >
                    <option value="featured">Catalogue order</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                  </select>
                </label>
                <button
                  type="button"
                  id="rep-product-clear"
                  className="rep-btn rep-btn-ghost rep-filter-clear"
                  onClick={() => setFilter({ query: "", category: "all", price: "any", occasion: "all", sort: "featured" })}
                >
                  Clear filters
                </button>
              </div>
            </details>
          </div>
          <div id="rep-products" className="rep-products-grid">
            {products.length === 0 ? (
              <p className="rep-empty">No products available yet.</p>
            ) : filteredProducts.length === 0 ? (
              <p className="rep-empty">No products match your filters.</p>
            ) : (
              filteredProducts.map((p, i) => {
                const pid = slugify(p.name) || String(p.display_order || i + 1);
                const link = shareLink(pid);
                const price = priceNumber(p) != null ? formatNaira(p.price) : "";
                const commission = estimatedCommission(p);
                const soldOut = isSoldOut(p);
                const stockLabel = soldOut ? String(p.stock_label || "").trim() || "Sold Out" : "";
                const img = validateUrl(directImageUrl(p.image_url));
                const initial = String(p.name || "?").trim().charAt(0).toUpperCase();
                const waShare = `https://wa.me/?text=${encodeURIComponent(link)}`;
                return (
                  <div
                    key={`${pid}-${i}`}
                    className={`rep-product${soldOut ? " is-soldout" : ""}`}
                    itemScope
                    itemType="https://schema.org/Product"
                  >
                    <div className={`rep-product-thumb${img ? "" : " no-image"}`}>
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const el = e.currentTarget;
                            if (!el.dataset.retried) {
                              el.dataset.retried = "true";
                              el.src = img;
                            } else {
                              el.parentNode?.classList.add("no-image");
                            }
                          }}
                        />
                      ) : null}
                      <span className="rep-thumb-initial">{initial}</span>
                      {soldOut ? <span className="rep-stock-badge">{stockLabel}</span> : null}
                    </div>
                    <div className="rep-product-info">
                      <h4 itemProp="name">{p.name}</h4>
                      {price ? (
                        <span className="rep-product-price" itemProp="price" content={priceNumber(p)}>
                          From {price}
                        </span>
                      ) : null}
                      <p itemProp="description">{p.description || ""}</p>
                      {p.sales_caption ? <p className="rep-caption">{p.sales_caption}</p> : null}
                      {commission ? <span className="rep-commission">{commission}</span> : null}
                    </div>
                    <div className="rep-product-actions">
                      <button
                        type="button"
                        className="rep-copy-btn"
                        aria-label={`Copy share link for ${p.name}`}
                        onClick={(e) => copyText(link, e.currentTarget)}
                      >
                        Copy link
                      </button>
                      <a className="rep-share-btn" href={waShare} target="_blank" rel="noopener noreferrer">
                        WhatsApp
                      </a>
                      {canShare ? (
                        <button
                          type="button"
                          className="rep-share-btn"
                          onClick={() => navigator.share({ title: "Gifts by VF", url: link }).catch(() => {})}
                        >
                          Share
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <details id="rep-commission-history" className="rep-commission-history" open>
          <summary>
            <span>Commission history</span>
            <span className="rep-history-summary-hint">Confirmed sales and payout details</span>
          </summary>
          <div className="rep-commission-history-content">
            {payoutsError ? (
              <p className="rep-hint">{payoutsError}</p>
            ) : (
              <>
                <p id="rep-payout-summary" className={`rep-hint${mine.length ? "" : " hidden"}`}>
                  {payoutSummary}
                </p>
                <div className="rep-table-scroll">
                  <table id="rep-payouts" className={`rep-table${mine.length ? "" : " hidden"}`}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Order Amount</th>
                        <th>Commission</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mine.slice(0, payoutShown).map((r, i) => {
                        const paid = String(r.status || "").toLowerCase() === "paid";
                        return (
                          <tr key={i}>
                            <td data-label="Product">{r.product}</td>
                            <td data-label="Order amount">{naira(parseFloat(r.order_amount) || 0)}</td>
                            <td data-label="Commission">{naira(parseFloat(r.commission) || 0)}</td>
                            <td data-label="Status">
                              <span className={`rep-status ${paid ? "paid" : "pending"}`}>
                                {paid ? "Paid" : "Pending"}
                              </span>
                            </td>
                            <td data-label="Date">{r.date}</td>
                          </tr>
                        );
                      })}
                      {mine.length > payoutShown ? (
                        <tr className="rep-showall-row">
                          <td colSpan={5}>
                            <button
                              type="button"
                              className="rep-showall"
                              onClick={() => setPayoutShown(mine.length)}
                            >
                              Show all commissions ({mine.length - payoutShown} more)
                            </button>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </details>
      </div>
    </section>
  );
}
