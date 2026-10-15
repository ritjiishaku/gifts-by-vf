"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Shared save UX for the admin modal forms:
// - exposes `pending` (from useActionState) so the Save button can show
//   "Saving…", disable, and block double submits,
// - on success shows a green "✓ Saved" for ~1s BEFORE closing the modal,
// - guards against losing edits (backdrop / ✕ ask "Discard unsaved changes?").
//
// Usage:
//   const [state, formAction, pending] = useActionState(saveXAction, {});
//   const { justSaved, markDirty, requestClose } = useAdminForm({ state, pending, onClose });
//
// Pass `autoClose: false` when a successful save should NOT close the modal
// (e.g. to show a follow-up panel) — the caller then closes it manually.
export function useAdminForm({ state, pending, autoClose = true, onClose }) {
  const [justSaved, setJustSaved] = useState(false);
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Server action results come back as a fresh object each time, so this fires
  // once per save. Show the confirmation, then close.
  const ok = Boolean(state?.ok);
  useEffect(() => {
    if (!ok) return undefined;
    dirtyRef.current = false;
    setJustSaved(true);
    if (!autoClose) return undefined;
    timerRef.current = setTimeout(() => {
      onCloseRef.current?.();
    }, 900);
    return () => clearTimeout(timerRef.current);
  }, [ok, state, autoClose]);

  // Reset the confirmation when the modal is reused for a new edit.
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setJustSaved(false);
  }, []);

  const requestClose = useCallback(() => {
    if (pending) return; // never discard an in-flight save
    if (!justSaved && dirtyRef.current) {
      if (!window.confirm("Discard unsaved changes?")) return;
    }
    onCloseRef.current?.();
  }, [pending, justSaved]);

  return { justSaved, markDirty, requestClose };
}
