"use client";

import { useRef, useState } from "react";
import { uploadImageAction } from "../actions";

// Downscale large photos in the browser before uploading (keeps files small and
// uploads fast). Animated GIFs are left untouched so they don't get flattened.
async function downscaleImage(file, maxWidth = 1600, quality = 0.82) {
  if (!(file && file.type && file.type.startsWith("image/"))) return file;
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width <= maxWidth) {
      bitmap.close?.();
      return file;
    }
    const scale = maxWidth / bitmap.width;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file; // canvas/bitmap unavailable — upload the original
  }
}

// Admin image field: upload to Supabase Storage, preview, and a paste-a-URL
// fallback. Submits exactly like the old <input name={name}> (hidden input).
export function ImageField({
  name,
  value = "",
  folder = "products",
  label = "Image",
  hint,
}) {
  const [url, setUrl] = useState(String(value || ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const prepared = await downscaleImage(file);
      const fd = new FormData();
      fd.set("file", prepared);
      fd.set("folder", folder);
      const res = await uploadImageAction(fd);
      if (res?.error) setError(res.error);
      else if (res?.url) setUrl(res.url);
    } catch (err) {
      // A thrown error here means the Server Action request never produced a
      // result — e.g. the file exceeded the Server Action body limit, the
      // session expired, or the request was dropped. Surface the underlying
      // message so failures are diagnosable instead of the bare generic text.
      const msg = String(err?.message || "");
      if (/too large|body exceeded|413|payload/i.test(msg)) {
        setError("That image is too large to upload. Please use a smaller file (under 6 MB).");
      } else if (msg) {
        setError(`Upload failed: ${msg}`);
      } else {
        setError("Upload failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-field admin-field-wide">
      <span className="admin-field-label">{label}</span>
      <input type="hidden" name={name} value={url} />

      <div className="admin-image-field">
        <div className="admin-image-preview">
          {url ? <img src={url} alt="" loading="lazy" /> : <span className="admin-image-empty">No image</span>}
        </div>

        <div className="admin-image-controls">
          <div className="admin-image-buttons">
            <button
              type="button"
              className="admin-btn"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? "Uploading…" : url ? "Replace image" : "Upload image"}
            </button>
            {url ? (
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setUrl("")}
                disabled={busy}
              >
                Remove
              </button>
            ) : null}
          </div>
          <input ref={inputRef} type="file" accept="image/*" onChange={onFile} hidden />
          <input
            type="url"
            className="admin-search admin-image-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="…or paste an image link (Google Drive or website)"
            aria-label="Image URL"
          />
        </div>
      </div>

      {error ? <p className="rep-error">{error}</p> : null}
      {hint ? <span className="admin-field-hint">{hint}</span> : null}
    </div>
  );
}
