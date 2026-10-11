"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import {
  logoutAction,
  deleteProductAction,
  deleteRepAction,
  deleteTestimonialAction,
  saveSettingAction,
  saveSettingsAction,
  deleteSettingAction,
} from "../actions";
import { SETTINGS_GROUPS } from "@/lib/settings-schema";
import { DEFAULTS } from "@/lib/site";
import { AdminProductForm } from "./AdminProductForm";
import { AdminRepForm } from "./AdminRepForm";
import { AdminTestimonialsForm } from "./AdminTestimonialsForm";

export function AdminDashboard({ settings, products, reps, testimonials }) {
  const [tab, setTab] = useState("settings");
  const [query, setQuery] = useState("");
  const [testimonialQuery, setTestimonialQuery] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingRep, setEditingRep] = useState(null);
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [addingTestimonial, setAddingTestimonial] = useState(false);

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return products || [];
    return (products || []).filter((p) =>
      [p.name, p.category, p.product_type, p.material, p.slug]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [products, query]);

  const filteredTestimonials = useMemo(() => {
    const q = String(testimonialQuery || "").trim().toLowerCase();
    if (!q) return testimonials || [];
    return (testimonials || []).filter((t) =>
      [t.name, t.source, t.quote].join(" ").toLowerCase().includes(q)
    );
  }, [testimonials, testimonialQuery]);

  const closeProductForm = () => {
    setEditingProduct(null);
    setAddingProduct(false);
  };

  const closeTestimonialForm = () => {
    setEditingTestimonial(null);
    setAddingTestimonial(false);
  };

  return (
    <section className="admin-section">
      <div className="admin-toolbar">
        <div>
          <h2>Dashboard</h2>
          <p className="admin-intro">
            Manage site settings, products, sales reps and testimonials. Changes go live immediately.
          </p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="admin-btn admin-btn-ghost">
            Sign out
          </button>
        </form>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {[
          ["settings", `Settings (${(settings || []).length})`],
          ["products", `Products (${(products || []).length})`],
          ["reps", `Sales reps (${(reps || []).length})`],
          ["testimonials", `Testimonials (${(testimonials || []).length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className="admin-tab"
            onClick={() => {
              setTab(key);
              setQuery("");
              setTestimonialQuery("");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "settings" ? <SettingsTab settings={settings} /> : null}

      {tab === "products" ? (
        <div>
          <div className="admin-toolbar">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name or category…"
              className="admin-search"
              aria-label="Search products"
            />
            <button
              type="button"
              className="admin-btn"
              onClick={() => setAddingProduct(true)}
            >
              + Add product
            </button>
          </div>

          <div className="admin-list">
            {filtered.map((p) => (
              <div key={p.id} className="admin-row">
                <div className="admin-row-thumb">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" loading="lazy" />
                  ) : (
                    String(p.name || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="admin-row-info">
                  <h4>{p.name}</h4>
                  <p>{[p.category, p.product_type, p.slug].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="admin-tags">
                  <span className="admin-tag">{p.price || "n/a"}</span>
                  <span className="admin-tag">{p.is_visible ? "visible" : "hidden"}</span>
                  <span className="admin-tag">{p.in_stock ? "in stock" : "sold out"}</span>
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
              <p className="rep-empty">No products found{query ? ` for “${query}”` : ""}.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "reps" ? (
        <div>
          <div className="admin-toolbar admin-toolbar-end">
            <button
              type="button"
              className="admin-btn"
              onClick={() => setEditingRep({})}
            >
              + Add rep
            </button>
          </div>
          <div className="admin-list">
            {(reps || []).map((r) => (
              <div key={r.id} className="admin-row">
                <div className="admin-row-info">
                  <h4>{r.name || r.rep_id}</h4>
                  <p>
                    Code: <strong>{r.rep_id}</strong> · {r.commission_rate ?? 0}% ·{" "}
                    {r.is_active ? "active" : "inactive"}
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
            {reps.length === 0 ? <p className="rep-empty">No sales reps yet.</p> : null}
          </div>
        </div>
      ) : null}

      {tab === "testimonials" ? (
        <div>
          <div className="admin-toolbar">
            <input
              type="search"
              value={testimonialQuery}
              onChange={(e) => setTestimonialQuery(e.target.value)}
              placeholder="Search testimonials by name, source or message…"
              className="admin-search"
              aria-label="Search testimonials"
            />
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
              <p className="rep-empty">No testimonials yet{testimonialQuery ? ` for “${testimonialQuery}”` : ""}.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {editingProduct || addingProduct ? (
        <AdminProductForm
          product={editingProduct || { is_visible: true, in_stock: true, featured: false }}
          onClose={closeProductForm}
        />
      ) : null}

      {editingRep ? <AdminRepForm rep={editingRep} onClose={() => setEditingRep(null)} /> : null}

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
              {group.fields.map((field) => (
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
              ))}
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
  const [state, formAction] = useActionState(saveSettingAction, {});
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="admin-setting-form">
      <input name="key" placeholder="Setting name (e.g. hero_title)" className="admin-search" />
      <input name="value" placeholder="Setting value" className="admin-search" />
      <button type="submit" className="admin-btn">
        Save
      </button>
      {state?.error ? <p className="rep-error">{state.error}</p> : null}
    </form>
  );
}

function EditSettingRow({ row }) {
  const [state, formAction] = useActionState(saveSettingAction, {});
  return (
    <form action={formAction} className="admin-setting-row">
      <input type="hidden" name="key" value={row.key} />
      <code>{row.key}</code>
      <input name="value" defaultValue={row.value} placeholder="Setting value" className="admin-search" />
      <div className="admin-actions">
        <button type="submit" className="admin-btn">
          Save
        </button>
        <form action={deleteSettingAction}>
          <input type="hidden" name="key" value={row.key} />
          <button
            type="submit"
            className="admin-btn admin-btn-danger"
            onClick={(e) => {
              if (!window.confirm(`Delete setting "${row.key}"?`)) e.preventDefault();
            }}
          >
            Delete
          </button>
        </form>
      </div>
      {state?.error ? <p className="rep-error">{state.error}</p> : null}
    </form>
  );
}
