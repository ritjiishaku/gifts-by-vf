"use client";

import { useEffect, useActionState } from "react";
import { saveRepAction } from "../actions";

export function AdminRepForm({ rep, onClose }) {
  const [state, formAction] = useActionState(saveRepAction, {});
  const isNew = !rep.id;

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
        <input type="hidden" name="id" value={rep.id || ""} />
        <div className="admin-modal-head">
          <h2>{isNew ? "Add rep" : "Edit rep"}</h2>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            Rep code *
            <input
              name="rep_id"
              defaultValue={rep.rep_id || ""}
              required
              placeholder="e.g. kofi (no spaces)"
            />
          </label>
          <label className="admin-field admin-field-wide">
            Name
            <input name="name" defaultValue={rep.name || ""} placeholder="e.g. Kofi Mensah" />
          </label>
          <label className="admin-field admin-field-wide">
            Commission rate (%)
            <input
              name="commission_rate"
              defaultValue={rep.commission_rate ?? ""}
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="e.g. 10 for 10%"
            />
          </label>
          <label className="admin-field admin-field-wide">
            Login PIN ({isNew ? "required" : "leave blank to keep current"})
            <input
              name="pin"
              type="password"
              autoComplete="new-password"
              placeholder={isNew ? "e.g. 4+ characters" : "Set a new PIN…"}
            />
          </label>
        </div>

        <div className="admin-checks">
          <label className="admin-check">
            <input
              type="checkbox"
              name="is_active"
              value="true"
              defaultChecked={rep.is_active !== false}
            />
            Active (can log in and share links)
          </label>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn">
            {isNew ? "Create rep" : "Save changes"}
          </button>
          {state?.error ? <p className="rep-error">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}
