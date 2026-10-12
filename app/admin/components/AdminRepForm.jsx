"use client";

import { useEffect, useState, useActionState } from "react";
import { saveRepAction } from "../actions";

const FALLBACK_PORTAL_URL = "https://giftsbyvf.vercel.app/reps";

function copyText(text) {
  return new Promise((resolve) => {
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (e) {
        /* clipboard unavailable — the admin can still select manually */
      }
      resolve();
    };
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(resolve).catch(fallback);
    } else {
      fallback();
    }
  });
}

// Turn a typed number into a wa.me target (digits only). Local Nigerian numbers
// starting with 0 get the 234 country code so the link actually resolves.
function normalizePhone(input) {
  let d = String(input || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = "234" + d.slice(1);
  return d;
}

export function AdminRepForm({ rep, onClose }) {
  const [state, formAction] = useActionState(saveRepAction, {});
  const [portalUrl, setPortalUrl] = useState(FALLBACK_PORTAL_URL);
  const [copied, setCopied] = useState("");
  const [phone, setPhone] = useState(rep.whatsapp || "");
  const isNew = !rep.id;
  const inviteMode = Boolean(rep.inviteMode);

  const addedRep = state?.ok && isNew && state.rep ? state.rep : null;
  const inviteRep =
    addedRep || (inviteMode ? { rep_id: rep.rep_id, name: rep.name } : null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPortalUrl(`${window.location.origin}/reps`);
    }
  }, []);

  // Only close automatically for edits / non-invite cases. New reps (and the
  // explicit invite flow) get the invite panel so details can be copied/shared.
  useEffect(() => {
    if (state?.ok && !(isNew && state.rep) && !inviteMode) onClose();
  }, [state, isNew, inviteMode, onClose]);

  const handleCopy = (text, key) => {
    copyText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  if (inviteRep) {
    const code = inviteRep.rep_id || "";
    const name = (inviteRep.name || "").trim();
    const message =
      `Hi ${name || "there"}, welcome to Gifts by VF sales team!\n` +
      `Your rep code: ${code}\n` +
      `1) Open ${portalUrl} 2) Enter your rep code 3) Create your own PIN (4+ characters) when prompted\n` +
      `Then you can share gift links and track your commission.`;
    const waNumber = normalizePhone(phone);
    const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    return (
      <div
        className="admin-modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="admin-modal-panel admin-modal-panel-narrow">
          <div className="admin-modal-head">
            <h2>{addedRep ? "Rep added" : "Invite rep"}</h2>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="rep-invite">
            <p className="rep-invite-lead">
              Share these details with <strong>{name || code}</strong> so they can
              set up their PIN and start sharing.
            </p>

            <div className="rep-invite-row">
              <span className="rep-invite-label">Rep code</span>
              <code className="rep-invite-code">{code}</code>
            </div>

            <div className="rep-invite-row">
              <span className="rep-invite-label">Portal link</span>
              <code className="rep-invite-link">{portalUrl}</code>
            </div>

            <div className="rep-invite-row">
              <span className="rep-invite-label">Message</span>
              <textarea
                className="rep-invite-msg"
                readOnly
                rows={6}
                value={message}
                onFocus={(e) => e.target.select()}
              />
            </div>

            <div className="rep-invite-row">
              <span className="rep-invite-label">
                WhatsApp number (optional)
              </span>
              <input
                className="rep-invite-input"
                type="tel"
                inputMode="tel"
                placeholder="e.g. 0803 123 4567 or 234803…"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <span className="rep-invite-hint">
                Add the rep&apos;s number to open their chat directly, or leave it
                blank to pick a contact in WhatsApp.
              </span>
            </div>

            <div className="rep-invite-actions">
              <button
                type="button"
                className="admin-btn"
                onClick={() => handleCopy(message, "message")}
              >
                {copied === "message" ? "Copied!" : "Copy message"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => handleCopy(code, "code")}
              >
                {copied === "code" ? "Copied!" : "Copy code"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => handleCopy(portalUrl, "link")}
              >
                {copied === "link" ? "Copied!" : "Copy link"}
              </button>
              <a
                className="admin-btn"
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
