"use client";

import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import {
  logoutAction,
  deleteProductAction,
  deleteRepAction,
  deleteTestimonialAction,
  deleteWhyUsAction,
  deletePortfolioAction,
  deleteHowToAction,
  deleteFaqAction,
  saveSettingAction,
  saveSettingsAction,
  deleteSettingAction,
} from "../actions";
import { matchesQuery, sortRows, visFilter, dupKey, duplicateKeySet } from "@/lib/admin-list";
import { SETTINGS_GROUPS } from "@/lib/settings-schema";
import { DEFAULTS } from "@/lib/site";
import { Icon } from "@/components/icons";
import { AdminProductForm } from "./AdminProductForm";
import { AdminRepForm } from "./AdminRepForm";
import { AdminTestimonialsForm } from "./AdminTestimonialsForm";
import { AdminWhyUsForm } from "./AdminWhyUsForm";
import { AdminPortfolioForm } from "./AdminPortfolioForm";
import { AdminHowToForm } from "./AdminHowToForm";
import { AdminFaqForm } from "./AdminFaqForm";
import { ContentRowsPanel } from "./ContentRowsPanel";
import { ImageField } from "./ImageField";
import { MigrateImages } from "./MigrateImages";
import { AdminThumb } from "./AdminThumb";

const PRODUCT_SEARCH_KEYS = ["name", "category", "subcategory", "product_type", "material", "occasion", "slug", "size"];
const TESTIMONIAL_SEARCH_KEYS = ["name", "source", "quote"];
const REP_SEARCH_KEYS = ["name", "rep_id"];

// Admin sections, in order. Used for the tab strip and the compact top-bar title.
const TABS = [
  ["settings", "Settings"],
  ["products", "Products"],
  ["reps", "Sales reps"],
  ["testimonials", "Testimonials"],
  ["portfolio", "Portfolio"],
  ["whyUs", "Why us"],
  ["howTo", "How to order"],
  ["faqs", "FAQ"],
];

export function AdminDashboard({ settings, products, reps, testimonials, whyUs, portfolio, howTo, faqs }) {
  const [tab, setTab] = useState("settings");
  // On narrow screens the section tabs collapse into a hamburger dropdown.
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef(null);
  // Search / sort / filter state is kept PER TAB and survives tab switches.
  const [queries, setQueries] = useState({});
  const [sorts, setSorts] = useState({});
  const [visModes, setVisModes] = useState({});
  const [repVis, setRepVis] = useState("all");
  const [dupsOnly, setDupsOnly] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingRep, setEditingRep] = useState(null);
  const [invitingRep, setInvitingRep] = useState(null);
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [addingTestimonial, setAddingTestimonial] = useState(false);

  const query = queries[tab] || "";
  const setQuery = (value) => setQueries((prev) => ({ ...prev, [tab]: value }));
  const sort = sorts[tab] || "order";
  const setSort = (value) => setSorts((prev) => ({ ...prev, [tab]: value }));
  const vis = visModes[tab] || "all";
  const setVis = (value) => setVisModes((prev) => ({ ...prev, [tab]: value }));

  // Close the mobile section menu on outside click or Escape.
  useEffect(() => {
    if (!navOpen) return undefined;
    const onPointerDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setNavOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen]);

  // Products sharing a (normalized) name + category — likely saved twice.
  const duplicateKeys = useMemo(() => duplicateKeySet(products), [products]);

  const filtered = useMemo(() => {
    let rows = (products || []).filter((p) => matchesQuery(p, PRODUCT_SEARCH_KEYS, query));
    rows = visFilter(rows, vis);
    rows = sortRows(rows, sort);
    if (dupsOnly) rows = rows.filter((p) => duplicateKeys.has(dupKey(p)));
    return rows;
  }, [products, query, sort, vis, dupsOnly, duplicateKeys]);

  const filteredReps = useMemo(() => {
    let rows = (reps || []).filter((r) => matchesQuery(r, REP_SEARCH_KEYS, query));
    if (repVis !== "all") {
      rows = rows.filter((r) => (repVis === "active" ? r.is_active !== false : r.is_active === false));
    }
    return rows.sort((a, b) =>
      String(a.name || a.rep_id || "").localeCompare(String(b.name || b.rep_id || ""), undefined, {
        sensitivity: "base",
      })
    );
  }, [reps, query, repVis]);

  const filteredTestimonials = useMemo(() => {
    let rows = (testimonials || []).filter((t) => matchesQuery(t, TESTIMONIAL_SEARCH_KEYS, query));
    rows = visFilter(rows, vis);
    return sortRows(rows, sort);
  }, [testimonials, query, sort, vis]);

  const closeProductForm = () => {
    setEditingProduct(null);
    setAddingProduct(false);
  };

  const closeTestimonialForm = () => {
    setEditingTestimonial(null);
    setAddingTestimonial(false);
  };

  const tabCounts = {
    settings: (settings || []).length,
    products: (products || []).length,
    reps: (reps || []).length,
    testimonials: (testimonials || []).length,
    portfolio: (portfolio || []).length,
    whyUs: (whyUs || []).length,
    howTo: (howTo || []).length,
    faqs: (faqs || []).length,
  };
  const activeTabLabel = (TABS.find(([key]) => key === tab) || [null, "Admin"])[1];

  return (
    <section className="admin-section">
      {/* Sticky admin bar. Title on the left; on desktop Sign out sits on the
          right, and on <=640px a hamburger takes that same spot and opens the
          sections + Sign out instead. */}
      <div className="admin-sticky" ref={navRef}>
        <div className="admin-topbar">
          <h2 className="admin-topbar-title">{activeTabLabel}</h2>

          <button
            type="button"
            className="admin-nav-toggle"
            aria-expanded={navOpen}
            aria-controls="admin-sections-menu"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="admin-nav-burger" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="admin-nav-toggle-label">Sections</span>
            <span className="admin-nav-chevron" aria-hidden="true">
              ▾
            </span>
          </button>

          <form action={logoutAction} className="admin-topbar-signout">
            <button type="submit" className="admin-btn admin-btn-ghost">
              Sign out
            </button>
          </form>
        </div>

        <div
          id="admin-sections-menu"
          className={`admin-nav-menu${navOpen ? " admin-nav-menu-open" : ""}`}
        >
          <div className="admin-tabs" role="tablist" aria-label="Admin sections">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className="admin-tab"
                onClick={() => {
                  setTab(key);
                  setNavOpen(false);
                }}
              >
                {label} ({tabCounts[key]})
              </button>
            ))}
          </div>

          <form action={logoutAction} className="admin-nav-signout">
            <button type="submit" className="admin-btn admin-btn-ghost">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {tab === "settings" ? <SettingsTab settings={settings} /> : null}

      {tab === "products" ? (
        <div>
          <div className="admin-toolbar">
            <div className="admin-list-filters">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, category, material…"
                className="admin-search"
                aria-label="Search products"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="admin-filter"
                aria-label="Sort products"
              >
                <option value="order">Sort: display order</option>
                <option value="name">Sort: name A–Z</option>
                <option value="newest">Sort: newest first</option>
              </select>
              <select
                value={vis}
                onChange={(e) => setVis(e.target.value)}
                className="admin-filter"
                aria-label="Filter products by visibility"
              >
                <option value="all">All</option>
                <option value="visible">Visible only</option>
                <option value="hidden">Hidden only</option>
              </select>
            </div>
            <button
              type="button"
              className="admin-btn"
              onClick={() => setAddingProduct(true)}
            >
              + Add product
            </button>
          </div>

          {duplicateKeys.size > 0 || dupsOnly ? (
            <div className="admin-dup-banner" role="status">
              <span>
                {duplicateKeys.size > 0
                  ? `⚠ ${duplicateKeys.size} product ${duplicateKeys.size === 1 ? "name" : "names"} look like duplicates (same name + category). Review or delete the extra rows.`
                  : "✓ No duplicate product names left."}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setDupsOnly((v) => !v)}
              >
                {dupsOnly ? "Show all products" : "Show only duplicates"}
              </button>
            </div>
          ) : null}

          <div className="admin-list">
            {filtered.map((p) => (
              <div key={p.id} className="admin-row">
                <div className="admin-row-thumb">
                  <AdminThumb
                    url={p.image_url}
                    fallback={String(p.name || "?").charAt(0).toUpperCase()}
                  />
                </div>
                <div className="admin-row-info">
                  <h4>{p.name}</h4>
                  <p>{[p.category, p.product_type, p.slug].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="admin-tags">
                  <span className="admin-tag">{p.price || "n/a"}</span>
                  <span className="admin-tag">{p.is_visible ? "visible" : "hidden"}</span>
                  <span className="admin-tag">{p.in_stock ? "in stock" : "sold out"}</span>
                  {duplicateKeys.has(dupKey(p)) ? (
                    <span className="admin-tag admin-tag-warn" title="Another product has this name in this category">
                      duplicate name
                    </span>
                  ) : null}
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => setEditingProduct(p)}
                  >
                    Edit
                  </button>
                  <form action={deleteProductAction} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="admin-btn admin-btn-danger"
                      onClick={(e) => {
                        if (!window.confirm(`Delete "${p.name}"?`)) e.preventDefault();
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className="rep-empty">
                {dupsOnly
                  ? "No duplicate products — nice."
                  : `No products found${query ? ` for “${query}”` : ""}.`}
              </p>
            ) : null}
          </div>
          {query.trim() || vis !== "all" || dupsOnly || sort !== "order" ? (
            <p className="admin-list-count">
              Showing {filtered.length} of {(products || []).length} products
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "reps" ? (
        <div>
          <div className="admin-toolbar">
            <div className="admin-list-filters">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reps by name or code…"
                className="admin-search"
                aria-label="Search sales reps"
              />
              <select
                value={repVis}
                onChange={(e) => setRepVis(e.target.value)}
                className="admin-filter"
                aria-label="Filter reps by status"
              >
                <option value="all">All</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
            <button
              type="button"
              className="admin-btn"
              onClick={() => setEditingRep({})}
            >
              + Add rep
            </button>
          </div>
          <div className="admin-list">
            {filteredReps.map((r) => (
              <div key={r.id} className="admin-row">
                <div className="admin-row-info">
                  <h4>{r.name || r.rep_id}</h4>
                  <p>
                    Code: <strong>{r.rep_id}</strong> · {r.commission_rate ?? 0}% ·{" "}
                    {r.is_active ? "active" : "inactive"} ·{" "}
                    <span style={{ color: r.has_pin ? "#2e7d32" : "#b8860b", fontWeight: "500" }}>
                      {r.has_pin ? "PIN set" : "PIN pending"}
                    </span>
                  </p>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => setEditingRep(r)}
                  >
                    Edit
                  </button>
                  {!r.has_pin ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      onClick={() => setInvitingRep(r)}
                    >
                      Invite
                    </button>
                  ) : null}
                  <form action={deleteRepAction} className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="admin-btn admin-btn-danger"
                      onClick={(e) => {
                        if (!window.confirm(`Delete rep "${r.rep_id}"?`)) e.preventDefault();
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {filteredReps.length === 0 ? (
              <p className="rep-empty">
                {reps.length === 0 ? "No sales reps yet." : `No reps found${query ? ` for “${query}”` : ""}.`}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "testimonials" ? (
        <div>
          <div className="admin-toolbar">
            <div className="admin-list-filters">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, source or message…"
                className="admin-search"
                aria-label="Search testimonials"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="admin-filter"
                aria-label="Sort testimonials"
              >
                <option value="order">Sort: display order</option>
                <option value="name">Sort: name A–Z</option>
                <option value="newest">Sort: newest first</option>
              </select>
              <select
                value={vis}
                onChange={(e) => setVis(e.target.value)}
                className="admin-filter"
                aria-label="Filter testimonials by visibility"
              >
                <option value="all">All</option>
                <option value="visible">Visible only</option>
                <option value="hidden">Hidden only</option>
              </select>
            </div>
            <button
              type="button"
              className="admin-btn"
              onClick={() => setAddingTestimonial(true)}
            >
              + Add testimonial
            </button>
          </div>

          <div className="admin-list">
            {filteredTestimonials.map((t) => (
              <div key={t.id} className="admin-row">
                <div className="admin-row-thumb">
                  {String(t.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="admin-row-info">
                  <h4>{t.name || "Anonymous"}</h4>
                  <p>{[t.source, t.rating ? `${t.rating}★` : "no rating"].filter(Boolean).join(" · ")}</p>
                  <blockquote className="admin-row-quote">“{t.quote || ""}”</blockquote>
                </div>
                <div className="admin-tags">
                  <span className="admin-tag">{t.is_visible ? "visible" : "hidden"}</span>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => setEditingTestimonial(t)}
                  >
                    Edit
                  </button>
                  <form action={deleteTestimonialAction} className="inline">
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="admin-btn admin-btn-danger"
                      onClick={(e) => {
                        if (!window.confirm(`Delete testimonial from "${t.name || "unknown"}"?`)) e.preventDefault();
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {filteredTestimonials.length === 0 ? (
              <p className="rep-empty">
                No testimonials yet{query ? ` for “${query}”` : ""}.
              </p>
            ) : null}
          </div>
          {query.trim() || vis !== "all" || sort !== "order" ? (
            <p className="admin-list-count">
              Showing {filteredTestimonials.length} of {(testimonials || []).length} testimonials
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "portfolio" ? (
        <ContentRowsPanel
          rows={portfolio}
          addLabel="+ Add piece"
          emptyText="No portfolio pieces yet."
          confirmText={(r) => `Delete “${r.caption || "this portfolio piece"}”?`}
          deleteAction={deletePortfolioAction}
          searchKeys={["caption", "category", "icon"]}
          searchPlaceholder="Search portfolio by caption or category…"
          sortable
          filterVisibility
          query={queries.portfolio || ""}
          onQueryChange={(v) => setQueries((prev) => ({ ...prev, portfolio: v }))}
          sort={sorts.portfolio || "order"}
          onSortChange={(v) => setSorts((prev) => ({ ...prev, portfolio: v }))}
          vis={visModes.portfolio || "all"}
          onVisChange={(v) => setVisModes((prev) => ({ ...prev, portfolio: v }))}
          renderThumb={(row) => (
            <AdminThumb
              url={row.image_url}
              fallback={String(row.caption || "P").charAt(0).toUpperCase()}
            />
          )}
          renderInfo={(row) => (
            <>
              <h4>{row.caption || "Untitled piece"}</h4>
              <p>{[row.category, row.icon ? `icon: ${row.icon}` : "", row.is_wide ? "wide tile" : ""].filter(Boolean).join(" · ") || "No category"}</p>
            </>
          )}
          renderForm={({ row, onClose }) => <AdminPortfolioForm row={row} onClose={onClose} />}
        />
      ) : null}

      {tab === "whyUs" ? (
        <ContentRowsPanel
          rows={whyUs}
          addLabel="+ Add card"
          emptyText="No “Why us” cards yet."
          confirmText={(r) => `Delete “${r.title || r.heading || "this card"}”?`}
          deleteAction={deleteWhyUsAction}
          searchKeys={["title", "heading", "description"]}
          searchPlaceholder="Search cards…"
          sortable
          filterVisibility
          query={queries.whyUs || ""}
          onQueryChange={(v) => setQueries((prev) => ({ ...prev, whyUs: v }))}
          sort={sorts.whyUs || "order"}
          onSortChange={(v) => setSorts((prev) => ({ ...prev, whyUs: v }))}
          vis={visModes.whyUs || "all"}
          onVisChange={(v) => setVisModes((prev) => ({ ...prev, whyUs: v }))}
          renderThumb={(row) => <Icon name={String(row.icon || "").trim().toLowerCase()} size={26} />}
          renderInfo={(row) => (
            <>
              <h4>{row.title || row.heading || "Untitled"}</h4>
              <p>{row.description || ""}</p>
            </>
          )}
          renderForm={({ row, onClose }) => <AdminWhyUsForm row={row} onClose={onClose} />}
        />
      ) : null}

      {tab === "howTo" ? (
        <ContentRowsPanel
          rows={howTo}
          addLabel="+ Add step"
          emptyText="No custom steps yet — the site falls back to the built-in steps."
          confirmText={(r) => `Delete step “${r.title || "Untitled"}”?`}
          deleteAction={deleteHowToAction}
          searchKeys={["title", "description"]}
          searchPlaceholder="Search steps…"
          sortable
          filterVisibility
          query={queries.howTo || ""}
          onQueryChange={(v) => setQueries((prev) => ({ ...prev, howTo: v }))}
          sort={sorts.howTo || "order"}
          onSortChange={(v) => setSorts((prev) => ({ ...prev, howTo: v }))}
          vis={visModes.howTo || "all"}
          onVisChange={(v) => setVisModes((prev) => ({ ...prev, howTo: v }))}
          renderThumb={(_row, i) => i + 1}
          renderInfo={(row) => (
            <>
              <h4>{row.title || "Untitled step"}</h4>
              <p>{row.description || ""}</p>
            </>
          )}
          renderForm={({ row, onClose }) => <AdminHowToForm row={row} onClose={onClose} />}
        />
      ) : null}

      {tab === "faqs" ? (
        <ContentRowsPanel
          rows={faqs}
          addLabel="+ Add FAQ"
          emptyText="No FAQs yet."
          confirmText={(r) => `Delete FAQ “${r.question || "this item"}”?`}
          deleteAction={deleteFaqAction}
          searchKeys={["question", "answer"]}
          searchPlaceholder="Search questions or answers…"
          sortable
          filterVisibility
          query={queries.faqs || ""}
          onQueryChange={(v) => setQueries((prev) => ({ ...prev, faqs: v }))}
          sort={sorts.faqs || "order"}
          onSortChange={(v) => setSorts((prev) => ({ ...prev, faqs: v }))}
          vis={visModes.faqs || "all"}
          onVisChange={(v) => setVisModes((prev) => ({ ...prev, faqs: v }))}
          renderThumb={(row) => String(row.question || "?").charAt(0).toUpperCase()}
          renderInfo={(row) => (
            <>
              <h4>{row.question || "Untitled question"}</h4>
              <p>{row.answer || ""}</p>
            </>
          )}
          renderForm={({ row, onClose }) => <AdminFaqForm row={row} onClose={onClose} />}
        />
      ) : null}

      {editingProduct || addingProduct ? (
        <AdminProductForm
          product={editingProduct || { is_visible: true, in_stock: true, featured: false }}
          onClose={closeProductForm}
        />
      ) : null}

      {editingRep ? <AdminRepForm rep={editingRep} onClose={() => setEditingRep(null)} /> : null}

      {invitingRep ? (
        <AdminRepForm
          rep={{ rep_id: invitingRep.rep_id, name: invitingRep.name, inviteMode: true }}
          onClose={() => setInvitingRep(null)}
        />
      ) : null}

      {editingTestimonial || addingTestimonial ? (
        <AdminTestimonialsForm
          testimonial={editingTestimonial || { is_visible: true }}
          onClose={closeTestimonialForm}
        />
      ) : null}
    </section>
  );
}

function SettingsTab({ settings }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <ContentSettingsForm settings={settings} />

      <MigrateImages />

      <details className="admin-settings-advanced">
        <summary>Advanced — all settings keys</summary>
        <div className="admin-toolbar">
          <div>
            <p className="admin-intro">
              Every key/value pair stored on the site. Use this to add a key the site
              starts reading later, or to edit anything not listed above.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? "Close" : "+ Add key"}
          </button>
        </div>

        {showAdd ? <AddSettingForm onDone={() => setShowAdd(false)} /> : null}

        <div>
          {(settings || []).map((row) => (
            <EditSettingRow key={row.key} row={row} />
          ))}
        </div>
      </details>
    </div>
  );
}

function ContentSettingsForm({ settings }) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, {});
  const values = useMemo(() => {
    const map = {};
    (settings || []).forEach((row) => {
      if (row && row.key) map[row.key] = row.value;
    });
    return map;
  }, [settings]);

  const placeholderFor = (field) =>
    values[field.key] || field.placeholder || DEFAULTS[field.key] || field.label;

  return (
    <form action={formAction} className="admin-settings-form">
      <div className="admin-toolbar">
        <div>
          <h3>Edit site content</h3>
          <p className="admin-intro">
            Type over any placeholder and save. Blank fields keep their current value
            (or the site default).
          </p>
        </div>
      </div>

      <div className="admin-settings-groups">
        {SETTINGS_GROUPS.map((group) => (
          <fieldset key={group.title} className="admin-settings-group">
            <legend>{group.title}</legend>
            <div className="admin-form-grid">
              {group.fields.map((field) =>
                /image_url$/i.test(field.key) ? (
                  <ImageField
                    key={field.key}
                    name={field.key}
                    value={values[field.key] || ""}
                    folder="site"
                    label={field.label}
                    hint="Upload a photo, or paste a link."
                  />
                ) : (
                  <label
                    key={field.key}
                    className={`admin-field${field.wide ? " admin-field-wide" : ""}`}
                  >
                    {field.label}
                    {field.type === "textarea" ? (
                      <textarea
                        name={field.key}
                        rows={2}
                        placeholder={placeholderFor(field)}
                      />
                    ) : (
                      <input name={field.key} placeholder={placeholderFor(field)} />
                    )}
                  </label>
                )
              )}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="admin-form-actions">
        <button type="submit" className="admin-btn" disabled={pending}>
          {pending ? "Saving…" : "Save content"}
        </button>
        {state?.ok ? <p className="admin-saved">Content saved.</p> : null}
        {state?.error ? <p className="rep-error">{state.error}</p> : null}
      </div>
    </form>
  );
}

function AddSettingForm({ onDone }) {
  const [state, formAction, pending] = useActionState(saveSettingAction, {});
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="admin-setting-form">
      <input name="key" placeholder="Setting name (e.g. hero_title)" className="admin-search" />
      <input name="value" placeholder="Setting value" className="admin-search" />
      <button type="submit" className="admin-btn" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error ? <p className="rep-error">{state.error}</p> : null}
    </form>
  );
}

function EditSettingRow({ row }) {
  const [state, formAction, pending] = useActionState(saveSettingAction, {});
  return (
    <form action={formAction} className="admin-setting-row">
      <input type="hidden" name="key" value={row.key} />
      <code>{row.key}</code>
      <input name="value" defaultValue={row.value} placeholder="Setting value" className="admin-search" />
      <div className="admin-actions">
        <button type="submit" className="admin-btn" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="submit"
          formAction={deleteSettingAction}
          className="admin-btn admin-btn-danger"
          onClick={(e) => {
            if (!window.confirm(`Delete setting "${row.key}"?`)) e.preventDefault();
          }}
        >
          Delete
        </button>
      </div>
      {state?.error ? <p className="rep-error">{state.error}</p> : null}
    </form>
  );
}
