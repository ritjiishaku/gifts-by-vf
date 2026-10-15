"use client";

import { useCallback, useEffect, useState } from "react";
import { migrateImagesAction, checkImageStorageAction } from "../actions";

// Copies images still hosted elsewhere (Google Drive etc.) into Supabase
// Storage, in small batches, updating each row's image_url as it goes.
// Safe to run repeatedly — already-migrated (Supabase) images are skipped.
//
// On mount it also checks that the storage bucket is reachable, so a missing
// bucket or service-role key shows a clear message instead of an upload that
// silently fails later.
export function MigrateImages() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  // status: "checking" | "ready" | "not-public" | "error"
  const [storage, setStorage] = useState({ status: "checking" });

  const check = useCallback(async () => {
    setStorage({ status: "checking" });
    try {
      const res = await checkImageStorageAction();
      if (res?.ok) setStorage({ status: res.public ? "ready" : "not-public" });
      else setStorage({ status: "error", message: res?.error || "Storage is not available." });
    } catch {
      setStorage({ status: "error", message: "Could not check storage." });
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

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

  const ready = storage.status === "ready" || storage.status === "not-public";

  return (
    <div className="admin-migrate">
      <div>
        <h4>Image storage</h4>
        <p className="admin-intro">
          Move any images still hosted on Google Drive or other sites into your fast
          Supabase storage. Safe to run more than once.
        </p>

        <div className="admin-storage-status">
          {storage.status === "checking" ? (
            <span className="admin-storage-dot is-checking" aria-hidden="true" />
          ) : null}
          {storage.status === "checking" ? (
            <span className="admin-saved">Checking storage…</span>
          ) : null}

          {storage.status === "ready" ? (
            <>
              <span className="admin-storage-dot is-ready" aria-hidden="true" />
              <span className="admin-saved">Storage connected — the public “images” bucket is ready.</span>
            </>
          ) : null}

          {storage.status === "not-public" ? (
            <>
              <span className="admin-storage-dot is-warn" aria-hidden="true" />
              <span className="admin-storage-status-warn">
                The “images” bucket exists but is not public — uploaded images won’t display. Set it to
                public in Supabase → Storage.
              </span>
            </>
          ) : null}

          {storage.status === "error" ? (
            <>
              <span className="admin-storage-dot is-error" aria-hidden="true" />
              <span className="rep-error">{storage.message}</span>
            </>
          ) : null}

          {storage.status !== "checking" ? (
            <button type="button" className="admin-storage-recheck" onClick={check} disabled={running}>
              Re-check
            </button>
          ) : null}
        </div>
      </div>

      <button type="button" className="admin-btn" onClick={run} disabled={running || !ready}>
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
