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
          {!isNew && rep.has_pin ? (
            <label className="admin-check">
              <input type="checkbox" name="reset_pin" value="true" />
              Reset PIN (allows rep to set a new PIN on their next login)
            </label>
          ) : null}
        </div>

        <div style={{ marginTop: "14px", padding: "12px 14px", background: "rgba(0,0,0,0.03)", borderRadius: "6px", fontSize: "0.82rem", color: "var(--text-light)", lineHeight: "1.5" }}>
          {isNew ? (
            <p style={{ margin: 0 }}>
              💡 <strong>Self-service PIN:</strong> The rep will set up their own PIN the first time they log in to the sales portal. Admins do not set rep PINs.
            </p>
          ) : rep.has_pin ? (
            <p style={{ margin: 0 }}>
              🔒 <strong>PIN Status: Set by rep.</strong> Rep PINs are managed by reps themselves. Check <em>Reset PIN</em> above if this rep forgot their PIN and needs to create a new one.
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              ⏳ <strong>PIN Status: Not set yet.</strong> The rep will be prompted to create their PIN upon their first visit with rep code <strong>{rep.rep_id}</strong>.
            </p>
          )}
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
