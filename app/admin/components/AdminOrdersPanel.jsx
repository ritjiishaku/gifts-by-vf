"use client";

import { useState, useActionState, useMemo, useEffect } from "react";
import { savePayoutAction, deletePayoutAction } from "../actions";
import { useAdminForm } from "./useAdminForm";
import { ProductPicker } from "./ProductPicker";
import { parseRate, commissionAmount, priceNumber, matchProduct } from "@/lib/format";

const STATUS_LABELS = { pending: "Pending", closed: "Closed", paid: "Paid" };

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Admin "Orders" tab — record an order for a rep (creates a "new order"
// notification for them) and move deals pending → closed → paid (closing
// notifies the rep once, on the transition only).
export function AdminOrdersPanel({ payouts, reps, products }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = edit

  const repName = useMemo(() => {
    const map = new Map();
    (reps || []).forEach((r) => map.set(String(r.rep_id || "").toLowerCase(), r.name || r.rep_id));
    return map;
  }, [reps]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = payouts || [];
    if (q) {
      list = list.filter((p) =>
        [p.product, p.rep_id, repName.get(String(p.rep_id || "").toLowerCase()) || "", p.status, p.date]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [payouts, query, repName]);

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-list-filters">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders by product, rep or status…"
            className="admin-search"
            aria-label="Search orders"
          />
        </div>
        <button type="button" className="admin-btn" onClick={() => setEditing({})}>
          + Record order
        </button>
      </div>

      <p className="admin-intro">
        Recording an order notifies the rep instantly. Changing a deal to <strong>Closed</strong>{" "}
        sends them a &ldquo;Deal closed&rdquo; alert.
      </p>

      {editing ? (
        <AdminPayoutForm
          key={editing.id || "new"}
          row={editing}
          reps={reps}
          products={products}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <div className="admin-list">
        {rows.map((p) => {
          const status = String(p.status || "pending").toLowerCase();
          const rate = p.commission_rate;
          return (
            <div key={p.id} className="admin-row">
              <div className="admin-row-info">
                <h4>{p.product || "Untitled product"}</h4>
                <p>
                  Rep: <strong>{repName.get(String(p.rep_id || "").toLowerCase()) || p.rep_id}</strong>{" "}
                  · {p.date || "no date"}
                </p>
              </div>
              <div className="admin-tags">
                <span className="admin-tag">
                  Order {Number(p.order_amount || 0).toLocaleString("en-NG")} ₦
                </span>
                <span className="admin-tag">
                  Commission {Number(p.commission || 0).toLocaleString("en-NG")} ₦
                  {rate != null && rate !== "" ? ` (${Number(rate)}%)` : ""}
                </span>
                <span className={`admin-status ${status}`}>{STATUS_LABELS[status] || status}</span>
              </div>
              <div className="admin-actions">
                <button type="button" className="admin-btn" onClick={() => setEditing(p)}>
                  Edit
                </button>
                <form action={deletePayoutAction} className="inline">
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="admin-btn admin-btn-danger"
                    onClick={(e) => {
                      if (!window.confirm(`Delete the order for "${p.product || "this product"}"?`))
                        e.preventDefault();
                    }}
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? (
          <p className="rep-empty">
            {(payouts || []).length === 0
              ? "No orders recorded yet. Use “Record order” when someone orders through a rep."
              : `No orders found${query ? ` for “${query}”` : ""}.`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AdminPayoutForm({ row, reps, products, onClose }) {
  const isNew = !row?.id;
  const [state, formAction, pending] = useActionState(savePayoutAction, {});

  // Shared admin modal UX: green "✓ Saved" before closing, plus a
  // "Discard unsaved changes?" guard on backdrop/✕.
  const { justSaved, markDirty, requestClose } = useAdminForm({
    state,
    pending,
    onClose,
  });

  const num = (v) => (v === null || v === undefined ? "" : String(v));

  // ── Controlled inputs ────────────────────────────────────────────────────
  const [repId, setRepId] = useState(row?.rep_id || "");
  const [product, setProduct] = useState(row?.product || "");
  const [amount, setAmount] = useState(num(row?.order_amount));
  // null = follow the rep's rate; a string = the owner typed their own figure.
  const [manualCommission, setManualCommission] = useState(null);
  // True once the owner types their own order amount — never overwrite it.
  const [amountManual, setAmountManual] = useState(Boolean(row?.id));
  // Custom names are opt-in. An old order whose product is no longer in the
  // catalogue opens in custom mode so it still saves.
  const [custom, setCustom] = useState(() => {
    const name = String(row?.product || "").trim();
    if (!name) return false;
    return !matchProduct(products, name);
  });

  const rep = useMemo(
    () => (reps || []).find((r) => String(r.rep_id) === repId) || null,
    [reps, repId]
  );
  const rate = parseRate(rep?.commission_rate);

  // The catalogue product the current name refers to (exact match only).
  const matched = useMemo(
    () => (custom ? null : matchProduct(products, product)),
    [custom, products, product]
  );
  const cataloguePrice = matched ? priceNumber(matched) : null;

  const amountNum = Number(amount);
  const hasAmount =
    String(amount).trim() !== "" && Number.isFinite(amountNum) && amountNum > 0;
  const autoCommission = rate != null && hasAmount ? commissionAmount(amountNum, rate) : null;

  // An emptied commission field means "no override" — fall back to the auto
  // figure. A deliberate "0" still counts as an override.
  const isOverridden =
    manualCommission !== null && String(manualCommission).trim() !== "";
  const commissionValue = isOverridden
    ? manualCommission
    : autoCommission == null
      ? ""
      : String(autoCommission);

  // Fill the order amount from the catalogue price whenever the picked
  // product changes — unless the owner typed their own amount.
  useEffect(() => {
    if (amountManual) return;
    if (cataloguePrice == null || cataloguePrice <= 0) return;
    setAmount(String(cataloguePrice));
  }, [cataloguePrice, amountManual]);

  return (
    <div
      className="admin-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) requestClose();
      }}
    >
      <form action={formAction} className="admin-modal-panel admin-modal-panel-narrow" onChange={markDirty}>
        <input type="hidden" name="id" value={row?.id || ""} />
        {/* "catalogue" -> the name must match a catalogue product exactly.
            "custom"    -> the owner ticked "Use a custom product name". */}
        <input type="hidden" name="product_mode" value={custom ? "custom" : "catalogue"} />
        {/* "auto"   -> derive the commission from the rep's rate.
            "manual" -> the owner overrode it in the form. */}
        <input type="hidden" name="commission_mode" value={isOverridden ? "manual" : "auto"} />
        <div className="admin-modal-head">
          <h2>{isNew ? "Record order" : "Edit order"}</h2>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={requestClose}
            disabled={pending}
          >
            Close
          </button>
        </div>

        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            Rep *
            <select
              name="rep_id"
              value={repId}
              onChange={(e) => {
                setRepId(e.target.value);
                // A new rep means a new rate — drop any manual override.
                setManualCommission(null);
              }}
              required
            >
              <option value="" disabled>
                Choose a rep…
              </option>
              {(reps || []).map((r) => (
                <option key={r.id ?? r.rep_id} value={r.rep_id}>
                  {r.name || r.rep_id} ({r.rep_id})
                </option>
              ))}
            </select>
            {rep ? (
              <span className="admin-field-hint">
                {rate != null
                  ? `Commission rate: ${rate}%`
                  : `⚠ ${rep.name || rep.rep_id} has no commission rate set — enter the commission manually.`}
              </span>
            ) : null}
          </label>

          <ProductPicker
            products={products}
            value={product}
            onChange={setProduct}
            custom={custom}
            onCustomChange={(next) => {
              setCustom(next);
              if (next) setManualCommission(null);
            }}
          />

          <label className="admin-field">
            Order amount (₦)
            <input
              type="number"
              name="order_amount"
              min="0"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountManual(true);
              }}
              placeholder="e.g. 25000"
            />
            {cataloguePrice != null ? (
              <span className="admin-field-hint">
                {amountManual ? (
                  <>
                    Catalogue price: ₦{cataloguePrice.toLocaleString("en-NG")}{" "}
                    <button
                      type="button"
                      className="admin-link-btn"
                      onClick={() => {
                        setAmount(String(cataloguePrice));
                        setAmountManual(false);
                        markDirty();
                      }}
                    >
                      Use catalogue price
                    </button>
                  </>
                ) : (
                  "Filled from the catalogue price."
                )}
              </span>
            ) : null}
          </label>

          <label className="admin-field">
            Commission (₦)
            <input
              type="number"
              name="commission"
              min="0"
              step="any"
              inputMode="decimal"
              value={commissionValue}
              onChange={(e) => setManualCommission(e.target.value)}
              placeholder={rate != null ? `auto: ${rate}%` : "enter manually"}
            />
            {rate != null ? (
              <span className="admin-field-hint">
                {isOverridden ? (
                  <>
                    Auto would be ₦{(autoCommission ?? 0).toLocaleString("en-NG")} ({rate}%) —{" "}
                    <button
                      type="button"
                      className="admin-link-btn"
                      onClick={() => {
                        setManualCommission(null);
                        markDirty();
                      }}
                    >
                      Use auto ({rate}%)
                    </button>
                  </>
                ) : hasAmount ? (
                  `${rate}% of ₦${amountNum.toLocaleString("en-NG")} = ₦${(autoCommission ?? 0).toLocaleString("en-NG")}`
                ) : (
                  "Enter the order amount to calculate the commission."
                )}
              </span>
            ) : null}
          </label>

          <label className="admin-field">
            Status
            <select name="status" defaultValue={String(row?.status || "pending").toLowerCase()}>
              <option value="pending">Pending</option>
              <option value="closed">Closed (deal won)</option>
              <option value="paid">Paid</option>
            </select>
          </label>

          <label className="admin-field">
            Date
            <input type="date" name="date" defaultValue={row?.date || today()} />
          </label>
        </div>

        <div className="admin-order-tip" style={{ marginTop: "14px", padding: "12px 14px", background: "rgba(0,0,0,0.03)", borderRadius: "6px", fontSize: "0.82rem", color: "var(--text-light)", lineHeight: "1.5" }}>
          <p style={{ margin: 0 }}>
            💡 <strong>New order</strong> alerts the rep as soon as you save. Switching status to{" "}
            <strong>Closed</strong> sends a one-time &ldquo;Deal closed&rdquo; notification.
          </p>
        </div>


        <div className="admin-form-actions">
          <button type="submit" className="admin-btn" disabled={pending}>
            {pending ? "Saving…" : isNew ? "Record order" : "Save changes"}
          </button>
          {justSaved ? <p className="admin-saved">✓ Saved</p> : null}
          {state?.error ? <p className="rep-error">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}
