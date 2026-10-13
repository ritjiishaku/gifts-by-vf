"use client";

import { useState } from "react";
import { useActionState } from "react";
import { loginAction } from "../actions";
import { Icon } from "@/components/icons";

export function AdminLogin() {
  const [state, formAction, pending] = useActionState(loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <a href="/#products" className="auth-logo" aria-label="Gifts by VF">
            <span>Gifts by V</span>
            <span className="brand-accent">F</span>
          </a>
          <span className="auth-brand-tag">Owner Admin</span>
        </div>

        <p className="auth-eyebrow">Admin only</p>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-hint">Enter the admin password to manage the site.</p>

        <form action={formAction} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">Password</span>
            <span className="admin-pass-field">
              <input
                type={show ? "text" : "password"}
                name="password"
                placeholder="Enter the admin password"
                autoFocus
                autoComplete="current-password"
                aria-label="Admin password"
              />
              <button
                type="button"
                className="admin-pass-toggle"
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                title={show ? "Hide password" : "Show password"}
                onClick={() => setShow((v) => !v)}
              >
                <Icon name={show ? "eye-off" : "eye"} />
              </button>
            </span>
          </label>

          {state?.error ? (
            <p className="auth-error" role="alert">
              {state.error}
            </p>
          ) : null}

          <button type="submit" disabled={pending} className="auth-submit">
            {pending ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
