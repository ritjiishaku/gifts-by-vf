"use client";

import { useActionState } from "react";
import { saveHowToAction } from "../actions";
import { useAdminForm } from "./useAdminForm";

export function AdminHowToForm({ row, onClose }) {
  const [state, formAction, pending] = useActionState(saveHowToAction, {});
  const isNew = !row.id;

  const { justSaved, markDirty, requestClose } = useAdminForm({
    state,
    pending,
    onClose,
  });

  return (
    <div
      className="admin-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <form
        action={formAction}
        className="admin-modal-panel admin-modal-panel-narrow"
        onChange={markDirty}
      >
        <div className="admin-modal-head">
          <h2>{isNew ? "Add " : "Edit "}how-to-order step</h2>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={requestClose} disabled={pending}>
            Close
          </button>
        </div>

        <input type="hidden" name="id" value={row.id || ""} />

        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            Step title *
            <input
              name="title"
              defaultValue={row.title || ""}
              required
              placeholder="e.g. Send your custom details"
            />
          </label>
          <label className="admin-field admin-field-wide">
            Step description *
            <textarea
              name="description"
              rows={3}
              defaultValue={row.description || ""}
              required
              placeholder="Explain this step to the customer."
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
          <button type="submit" className="admin-btn" disabled={pending}>
            {pending ? "Saving…" : isNew ? "Add step" : "Save changes"}
          </button>
          {justSaved ? <p className="admin-saved">✓ Saved</p> : null}
          {state?.error ? <p className="rep-error">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}