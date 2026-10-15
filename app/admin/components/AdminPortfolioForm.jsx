"use client";

import { useActionState } from "react";
import { savePortfolioAction } from "../actions";
import { IconPicker } from "./IconPicker";
import { useAdminForm } from "./useAdminForm";

export function AdminPortfolioForm({ row, onClose }) {
  const [state, formAction, pending] = useActionState(savePortfolioAction, {});
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
          <h2>{isNew ? "Add " : "Edit "}portfolio piece</h2>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={requestClose} disabled={pending}>
            Close
          </button>
        </div>

        <input type="hidden" name="id" value={row.id || ""} />

        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            Image URL
            <input
              name="image_url"
              defaultValue={row.image_url || ""}
              placeholder="Paste an image link (Google Drive or website)"
            />
          </label>
          <label className="admin-field admin-field-wide">
            Caption
            <input
              name="caption"
              defaultValue={row.caption || ""}
              placeholder="e.g. Personalised acrylic keyring set"
            />
          </label>
          <label className="admin-field">
            Category
            <input
              name="category"
              defaultValue={row.category || ""}
              placeholder="e.g. Customized Jewelry"
            />
          </label>
          <label className="admin-field">
            Display order
            <input
              name="display_order"
              type="number"
              defaultValue={row.display_order || ""}
              placeholder="e.g. 1 (lower shows first)"
            />
          </label>
          <IconPicker
            name="icon"
            value={row.icon}
            allowNone
            hint="Optional badge shown on the tile."
          />
        </div>

        <div className="admin-checks">
          <label className="admin-check">
            <input
              type="checkbox"
              name="is_wide"
              value="true"
              defaultChecked={Boolean(row.is_wide)}
            />
            Wide tile (spans two columns)
          </label>
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
            {pending ? "Saving…" : isNew ? "Add piece" : "Save changes"}
          </button>
          {justSaved ? <p className="admin-saved">✓ Saved</p> : null}
          {state?.error ? <p className="rep-error">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}