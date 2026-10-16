"use client";

import { useState, useActionState } from "react";
import { saveProductAction } from "../actions";
import { IconPicker } from "./IconPicker";
import { ImageField } from "./ImageField";
import { AdminThumb } from "./AdminThumb";
import { useAdminForm } from "./useAdminForm";

export function AdminProductForm({ product, onClose }) {
  const [state, formAction, pending] = useActionState(saveProductAction, {});
  const [dismissedDuplicate, setDismissedDuplicate] = useState(false);
  const isNew = !product.id;

  const { justSaved, markDirty, requestClose } = useAdminForm({
    state,
    pending,
    onClose,
  });

  const duplicate = state?.duplicate && !dismissedDuplicate ? state : null;
  // Values echoed back by a blocked or failed save. React 19 resets the form's
  // uncontrolled fields when the action resolves, so we repopulate them (and
  // remount the form via `attempt`) to keep what the admin entered.
  const values = state?.values || null;

  return (
    <div
      className="admin-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <form
        key={state?.attempt ?? 0}
        id="admin-product-form"
        action={formAction}
        className="admin-modal-panel"
        onChange={markDirty}
      >
        <div className="admin-modal-head">
          <h2>{isNew ? "Add product" : "Edit product"}</h2>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={requestClose}
            disabled={pending}
          >
            Close
          </button>
        </div>

        <input type="hidden" name="id" value={product.id || ""} />

        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            Name *
            <input name="name" defaultValue={values?.name ?? product.name ?? ""} placeholder="e.g. Engraved Name Necklace" required />
          </label>
          <label className="admin-field">
            Slug
            <input name="slug" defaultValue={values?.slug ?? product.slug ?? ""} placeholder="Leave blank to auto-fill from the name" />
          </label>
          <label className="admin-field">
            Price (display text)
            <input name="price" defaultValue={values?.price ?? product.price ?? ""} placeholder="e.g. 12,500" />
          </label>
          <label className="admin-field">
            Category
            <input name="category" defaultValue={values?.category ?? product.category ?? ""} placeholder="e.g. Customized Jewelry" />
          </label>
          <label className="admin-field">
            Subcategory
            <input name="subcategory" defaultValue={values?.subcategory ?? product.subcategory ?? ""} placeholder="e.g. Engraved" />
          </label>
          <label className="admin-field">
            Product type
            <input name="product_type" defaultValue={values?.product_type ?? product.product_type ?? ""} placeholder="e.g. Engraved Necklace" />
          </label>
          <label className="admin-field">
            Occasion
            <input name="occasion" defaultValue={values?.occasion ?? product.occasion ?? ""} placeholder="e.g. Birthday, Wedding" />
          </label>
          <label className="admin-field">
            Material
            <input name="material" defaultValue={values?.material ?? product.material ?? ""} placeholder="e.g. 925 sterling silver" />
          </label>
          <label className="admin-field">
            Size
            <input name="size" defaultValue={values?.size ?? product.size ?? ""} placeholder="e.g. 45cm chain" />
          </label>
          <label className="admin-field">
            Processing time
            <input name="turnaround" defaultValue={values?.turnaround ?? product.turnaround ?? ""} placeholder="e.g. 3–5 working days" />
          </label>
          <label className="admin-field">
            Display order
            <input name="display_order" type="number" defaultValue={values?.display_order ?? product.display_order ?? ""} placeholder="e.g. 1 (lower shows first)" />
          </label>
          <label className="admin-field">
            Stock label (when sold out)
            <input name="stock_label" defaultValue={values?.stock_label ?? product.stock_label ?? ""} placeholder="e.g. Pre-Order Only" />
          </label>
          <IconPicker
            name="icon"
            value={values ? values.icon : product.icon}
            hint="Optional — the glyph shown on the product card."
          />
          <ImageField
            name="image_url"
            value={values ? values.image_url : product.image_url}
            folder="products"
            label="Image"
            hint="Upload a photo, or paste a link. Large photos are resized automatically."
          />
          <label className="admin-field admin-field-wide">
            Video URL (YouTube / Drive / mp4)
            <input name="video_url" defaultValue={values?.video_url ?? product.video_url ?? ""} placeholder="Paste a YouTube, Google Drive, or .mp4 / .webm link" />
          </label>
          <label className="admin-field admin-field-wide">
            Description
            <textarea name="description" rows={3} defaultValue={values?.description ?? product.description ?? ""} placeholder="Describe the piece — materials, personalisation options, what makes it special." />
          </label>
          <label className="admin-field admin-field-wide">
            Sales caption
            <textarea name="sales_caption" rows={2} defaultValue={values?.sales_caption ?? product.sales_caption ?? ""} placeholder="Ready-made pitch reps can share with customers." />
          </label>
          <label className="admin-field admin-field-wide">
            Delivery note
            <input name="delivery_note" defaultValue={values?.delivery_note ?? product.delivery_note ?? ""} placeholder="e.g. Nationwide delivery in 3–5 days" />
          </label>
          <label className="admin-field admin-field-wide">
            Payment note
            <input name="payment_note" defaultValue={values?.payment_note ?? product.payment_note ?? ""} placeholder="e.g. 50% deposit to start" />
          </label>
        </div>

        <div className="admin-checks">
          {[
            ["is_visible", "Visible on site"],
            ["in_stock", "In stock"],
            ["featured", "Featured"],
          ].map(([key, label]) => (
            <label key={key} className="admin-check">
              <input
                type="checkbox"
                name={key}
                value="true"
                defaultChecked={values ? Boolean(values[key]) : Boolean(product[key])}
              />
              {label}
            </label>
          ))}
        </div>

        {duplicate ? (
          <div className="admin-warning" role="alert">
            <p className="admin-warning-title">
              ⚠ A product with this name already exists in this category.
            </p>
            <div className="admin-dup-list">
              {(duplicate.existing || []).map((row) => (
                <span key={row.id} className="admin-dup-item">
                  {row.image_url ? <AdminThumb url={row.image_url} /> : null}
                  {row.name}
                </span>
              ))}
            </div>
            <p className="admin-warning-hint">
              Check the existing { (duplicate.existing || []).length === 1 ? "product" : "products" }
              {" "}above — or save this one anyway if it really is a different piece.
            </p>
            <div className="admin-warning-actions">
              <button type="submit" name="force" value="true" className="admin-btn">
                Save anyway
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setDismissedDuplicate(true)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn" disabled={pending}>
            {pending ? "Saving…" : isNew ? "Create product" : "Save changes"}
          </button>
          {justSaved ? <p className="admin-saved">✓ Saved</p> : null}
          {state?.error && !duplicate ? <p className="rep-error">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}
