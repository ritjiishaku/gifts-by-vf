"use client";

import { useEffect, useActionState } from "react";
import { saveFaqAction } from "../actions";

export function AdminFaqForm({ row, onClose }) {
  const [state, formAction] = useActionState(saveFaqAction, {});
  const isNew = !row.id;

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
          <h2>{isNew ? "Add " : "Edit "}FAQ</h2>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <input type="hidden" name="id" value={row.id || ""} />

        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            Question *
            <input
              name="question"
              defaultValue={row.question || ""}
              required
              placeholder="e.g. How long does delivery take?"
            />
          </label>
          <label className="admin-field admin-field-wide">
            Answer *
            <textarea
              name="answer"
              rows={4}
              defaultValue={row.answer || ""}
              required
              placeholder="The answer customers will see."
            />
          </label>
          <label className="admin-field admin-field-wide">
            Display order
            <input
              name="display_order"
              type="number"
              defaultValue={row.display_order || ""}
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
              defaultChecked={row.is_visible !== false}
            />
            Visible on site
          </label>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn">
            {isNew ? "Add FAQ" : "Save changes"}
          </button>
          {state?.error ? <p className="rep-error">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}