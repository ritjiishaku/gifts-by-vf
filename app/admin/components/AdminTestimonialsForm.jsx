"use client";

import { useEffect, useActionState } from "react";
import { saveTestimonialAction } from "../actions";

const SOURCE_SUGGESTIONS = [
  "Facebook",
  "WhatsApp",
  "Email / Gmail",
  "Instagram",
  "Google",
  "In person",
];

export function AdminTestimonialsForm({ testimonial, onClose }) {
  const [state, formAction] = useActionState(saveTestimonialAction, {});
  const isNew = !testimonial.id;

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <div
      className="admin-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form action={formAction} className="admin-modal-panel admin-modal-panel-narrow">
        <div className="admin-modal-head">
          <h2>{isNew ? "Add testimonial" : "Edit testimonial"}</h2>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <input type="hidden" name="id" value={testimonial.id || ""} />

        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            Name *
            <input
              name="name"
              defaultValue={testimonial.name || ""}
              required
              placeholder="e.g. Ada Obi"
            />
          </label>
          <label className="admin-field admin-field-wide">
            Message *
            <textarea
              name="quote"
              rows={3}
              defaultValue={testimonial.quote || ""}
              required
              placeholder="What did they say?"
            />
          </label>
          <label className="admin-field">
            Source
            <input
              name="source"
              list="testimonial-sources"
              defaultValue={testimonial.source || ""}
              placeholder="e.g. Facebook"
            />
            <datalist id="testimonial-sources">
              {SOURCE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="admin-field">
            Rating (1–5)
            <select name="rating" defaultValue={testimonial.rating ?? ""}>
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field admin-field-wide">
            Display order
            <input
              name="display_order"
              type="number"
              defaultValue={testimonial.display_order || ""}
              placeholder="e.g. 1 (lower shows first)"
            />
          </label>
        </div>

        <div className="admin-checks">
          <label className="admin-check">
            <input
              type="checkbox"
              name="is_visible"
              value="true"
              defaultChecked={testimonial.is_visible !== false}
            />
            Visible on site
          </label>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn">
            {isNew ? "Add testimonial" : "Save changes"}
          </button>
          {state?.error ? <p className="rep-error">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}