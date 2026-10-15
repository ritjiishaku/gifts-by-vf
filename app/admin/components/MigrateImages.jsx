"use client";

import { useState } from "react";
import { migrateImagesAction } from "../actions";

// Copies images still hosted elsewhere (Google Drive etc.) into Supabase
// Storage, in small batches, updating each row's image_url as it goes.
// Safe to run repeatedly — already-migrated (Supabase) images are skipped.
export function MigrateImages() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const run = async () => {
    if (
      !window.confirm(
        "Copy all remaining site images into Supabase Storage? Their image links will be updated to the new, faster URLs."
      )
    ) {
      return;
    }
    setRunning(true);
    setError("");
    setProgress({ migrated: 0, total: null, remaining: null });
    let migrated = 0;
    let guard = 0;
    try {
      while (guard < 200) {
        guard += 1;
        const fd = new FormData();
        fd.set("limit", "6");
        const res = await migrateImagesAction({}, fd);
        if (res?.error) {
          setError(res.error);
          break;
        }
        migrated += res.migrated || 0;
        setProgress({ migrated, total: res.total, remaining: res.remaining });
        if (!res.remaining || res.remaining <= 0) break;
        if ((res.migrated || 0) === 0) {
          setError("Some images could not be fetched — they were left unchanged.");
          break;
        }
      }
    } catch {
      setError("Migration stopped unexpectedly. You can run it again to continue.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="admin-migrate">
      <div>
        <h4>Image storage</h4>
        <p className="admin-intro">
          Move any images still hosted on Google Drive or other sites into your fast
          Supabase storage. Safe to run more than once.
        </p>
      </div>
      <button type="button" className="admin-btn" onClick={run} disabled={running}>
        {running ? "Migrating…" : "Migrate images"}
      </button>
      {progress ? (
        <p className="admin-saved">
          {running ? "Working… " : "Done. "}Migrated {progress.migrated}
          {progress.total != null ? ` of ${progress.total}` : ""}
          {progress.remaining ? ` — ${progress.remaining} left` : ""}.
        </p>
      ) : null}
      {error ? <p className="rep-error">{error}</p> : null}
    </div>
  );
}
