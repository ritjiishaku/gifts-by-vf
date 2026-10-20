"use client";

import { useEffect, useState } from "react";
import {
  getReferral,
  setReferral,
  readStoredReferral,
  storeReferral,
  updateStoredReferralName,
  clearReferral,
} from "./referral-store";

export function ReferralBanner({ reps }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("clearref")) {
      clearReferral();
      return;
    }

    const isValidRep = (repId) => {
      const key = String(repId || "").trim().toLowerCase();
      if (!key) return false;
      return (reps || []).some(
        (r) =>
          isActiveRep(r) && String(r.rep_id || "").trim().toLowerCase() === key
      );
    };

    const refParam = params.get("ref");
    if (refParam && isValidRep(refParam)) {
      const key = String(refParam).trim().toLowerCase();
      const rep = (reps || []).find(
        (r) => String(r.rep_id || "").trim().toLowerCase() === key
      );
      // Persist the display name too, so later visits still name the rep even
      // if a future page's server-side rep lookup fails.
      const clean = storeReferral(refParam, rep && rep.name);
      if (clean) {
        setReferral({ rep_id: clean, name: (rep && rep.name) || clean });
      }
    }

    const stored = readStoredReferral();
    if (stored) {
      if (!isValidRep(stored.rep_id)) {
        clearReferral();
      } else {
        const rep = (reps || []).find(
          (r) => String(r.rep_id || "").trim().toLowerCase() === stored.rep_id
        );
        // Stored name (with rep_id fallback) wins over showing nothing if the
        // live lookup fails; refresh the stored name when we resolve it.
        updateStoredReferralName(stored.rep_id, rep && rep.name);
        setReferral({ rep_id: stored.rep_id, name: (rep && rep.name) || stored.name });
      }
    }

    const current = getReferral();
    if (current && current.name) {
      setLabel(current.name);
      document.body.classList.add("has-referral");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => document.body.classList.remove("has-referral");
  }, []);

  const dismiss = () => {
    setLabel("");
    document.body.classList.remove("has-referral");
    clearReferral();
  };

  const visible = Boolean(label);

  return (
    <div
      id="referral-banner"
      className={visible ? "referral-banner visible" : "referral-banner"}
      role="status"
    >
      {visible ? (
        <>
          <span>{`You were referred by ${label}`}</span>
          <button
            type="button"
            className="referral-close"
            aria-label="Dismiss referral message"
            onClick={dismiss}
          >
            &times;
          </button>
        </>
      ) : null}
    </div>
  );
}

function isActiveRep(row) {
  const raw =
    row.is_active != null && row.is_active !== "" ? row.is_active : row.is_visible;
  if (typeof raw === "boolean") return raw;
  const v = String(raw || "").toLowerCase();
  return v !== "false" && v !== "0";
}
