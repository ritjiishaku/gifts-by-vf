"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { SiteImage } from "@/components/SiteImage";
import {
  slugify,
  priceNumber,
  formatNaira,
  isSoldOut,
  directImageUrl,
  validateUrl,
} from "@/lib/format";

const REP_PAYOUT_LIMIT = 5;
const REP_CREDIT_WINDOW_DAYS = 30;
const SESSION_KEY = "vf_rep_session";

// Record which notifications already existed at login, so the poll's toast
// only ever fires for genuinely new arrivals.
function toSeenSet(list) {
  return new Set(
    (Array.isArray(list) ? list : [])
      .map((n) => n?.id)
      .filter((id) => id !== undefined && id !== null)
  );
}

export function RepPortal({ products, commissionRule }) {
  const [step, setStep] = useState("login");
  const [rep, setRep] = useState(null);
  const [input, setInput] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState("");
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [pinNotice, setPinNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payouts, setPayouts] = useState(null);
  const [payoutsError, setPayoutsError] = useState("");
  const [payoutShown, setPayoutShown] = useState(REP_PAYOUT_LIMIT);
  const [filter, setFilter] = useState({ query: "", category: "all", price: "any", occasion: "all", sort: "featured" });
  const [pinStatus, setPinStatus] = useState("idle"); // idle | checking | no-pin | has-pin | not-found
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  // New-notification toast: only ids never seen this session trigger a toast.
  // Null while logged out; seeded from the login payload so pre-existing
  // unread items show in the bell but never pop a toast.
  const seenIdsRef = useRef(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) setInput(saved);
  }, []);

  // Look up whether the typed rep code has a PIN yet, so we only show the
  // "Set up your PIN" link to first-time reps. Debounced + abortable so rapid
  // typing can't produce stale results.
  useEffect(() => {
    if (step !== "login") {
      setPinStatus("idle");
      return;
    }
    const code = input.trim();
    if (!code) {
      setPinStatus("idle");
      return;
    }
    const controller = new AbortController();
    setPinStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/reps?rep=${encodeURIComponent(code)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.found) {
          setPinStatus("not-found");
        } else {
          setPinStatus(json.hasPin ? "has-pin" : "no-pin");
        }
      } catch (err) {
        if (err.name !== "AbortError") setPinStatus("idle");
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input, step]);

  // Live updates: while the dashboard is open, poll every 30s so new orders and
  // closed deals appear without logging out (also refreshes the commission
  // table). 30s = 2 requests/min, safely under the API's 10/min throttle.
  // Poll failures are silent — the last known list stays on screen.
  useEffect(() => {
    if (step !== "dashboard" || !rep?.rep_id || !pin) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/reps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", rep: rep.rep_id, pin }),
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        if (Array.isArray(json.notifications)) {
          const seen = seenIdsRef.current;
          if (seen === null) {
            // First poll after login without a seed (defensive) — adopt the
            // list silently rather than toasting a wall of old items.
            seenIdsRef.current = toSeenSet(json.notifications);
          } else {
            const fresh = json.notifications.filter((n) => n?.id !== undefined && !seen.has(n.id));
            json.notifications.forEach((n) => {
              if (n?.id !== undefined) seen.add(n.id);
            });
            if (fresh.length) setToast(fresh[0]);
          }
          setNotifications(json.notifications);
        }
        if (Array.isArray(json.payouts)) setPayouts(json.payouts);
      } catch {
        /* network blip — keep showing the last known list */
      }
    };
    const timer = setInterval(tick, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [step, rep, pin]);

  // Close the notification dropdown on outside click or Escape.
  useEffect(() => {
    if (!bellOpen) return undefined;
    const onPointerDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setBellOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [bellOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Toasts self-dismiss after 6s (reduced-motion users just get no animation).
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Optimistic read: flip locally, tell the server fire-and-forget.
  const markNotificationsRead = () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const code = String(rep?.rep_id || "").trim();
    if (!code || !pin) return;
    fetch("/api/reps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-notifications", rep: code, pin }),
      cache: "no-store",
    }).catch(() => {});
  };

  const openNotification = (n) => {
    markNotificationsRead();
    setBellOpen(false);
    if (n?.type === "new_order") {
      const el = document.getElementById("rep-commission-history");
      if (el) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const notifTime = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  };

  const login = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    setError("");
    const id = input.trim();
    const pinValue = pin.trim();
    if (!id) {
      setError("Enter your rep code.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rep: id, pin: pinValue }),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not sign you in right now. Please try again.");
        return;
      }
      if (json.needsPinSetup) {
        setRep({ rep_id: json.repCode, name: json.repName });
        setStep("setup-pin");
        setNewPin("");
        setConfirmPin("");
        setError("");
        return;
      }
      const found = json.rep || {};
      setRep({ rep_id: found.rep_id, name: found.name, rate: found.commission_rate });
      setPayoutsError("");
      setPayouts(Array.isArray(json.payouts) ? json.payouts : []);
      setNotifications(Array.isArray(json.notifications) ? json.notifications : []);
      seenIdsRef.current = toSeenSet(json.notifications);
      setToast(null);
      sessionStorage.setItem(SESSION_KEY, found.rep_id);
      setStep("dashboard");
    } catch (err) {
      setError("Could not sign you in right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const setupPin = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    setError("");
    const code = (rep?.rep_id || input).trim();
    const p1 = newPin.trim();
    const p2 = confirmPin.trim();

    if (!p1 || p1.length < 4) {
      setError("PIN must be at least 4 digits or characters.");
      return;
    }
    if (p1 !== p2) {
      setError("PINs do not match. Please re-enter.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setup-pin",
          rep: code,
          newPin: p1,
          confirmPin: p2,
        }),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not set your PIN right now.");
        return;
      }
      const found = json.rep || {};
      setRep({ rep_id: found.rep_id, name: found.name, rate: found.commission_rate });
      setPayoutsError("");
      setPayouts(Array.isArray(json.payouts) ? json.payouts : []);
      setNotifications(Array.isArray(json.notifications) ? json.notifications : []);
      seenIdsRef.current = toSeenSet(json.notifications);
      setToast(null);
      sessionStorage.setItem(SESSION_KEY, found.rep_id);
      setPinNotice("Your PIN has been created successfully! Remember it for future sign-ins.");
      setStep("dashboard");
    } catch (err) {
      setError("Could not set your PIN right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setRep(null);
    setPayouts(null);
    setNotifications([]);
    setBellOpen(false);
    seenIdsRef.current = null;
    setToast(null);
    setStep("login");
    setInput("");
    setPin("");
  };

  const rateText = useMemo(() => {
    const raw = String(rep?.rate ?? "").trim();
    if (/^\d+(\.\d+)?$/.test(raw)) return parseFloat(raw) + "%";
    if (!raw.endsWith("%")) return raw ? raw + "%" : "—";
    return raw;
  }, [rep]);

  const ruleText = useMemo(
    () =>
      commissionRule ||
      `Commission is ${rateText} of the product's catalogue price, excluding delivery.`,
    [commissionRule, rateText]
  );

  const categories = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => {
      const c = String(p.category || "").trim();
      if (c) map.set(c.toLowerCase(), c);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const occasions = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) =>
      String(p.occasion || "")
        .split(",")
        .forEach((t) => {
          t = t.trim();
          if (t) map.set(t.toLowerCase(), t);
        })
    );
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = String(filter.query || "").trim().toLowerCase();
    let list = (products || []).filter((p) => {
      if (filter.category !== "all" && String(p.category || "").trim().toLowerCase() !== filter.category) return false;
      if (filter.occasion !== "all") {
        const tags = String(p.occasion || "").toLowerCase().split(",").map((v) => v.trim());
        if (!tags.includes(filter.occasion)) return false;
      }
      if (filter.price !== "any") {
        const price = priceNumber(p);
        if (price == null) return false;
        if (filter.price === "under-20000" && !(price < 20000)) return false;
        if (filter.price === "20000-50000" && !(price >= 20000 && price <= 50000)) return false;
        if (filter.price === "above-50000" && !(price > 50000)) return false;
      }
      if (q) {
        const searchable = [p.name, p.description, p.category, p.material, p.size, p.price].join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
    if (filter.sort === "price-asc" || filter.sort === "price-desc") {
      const direction = filter.sort === "price-asc" ? 1 : -1;
      list = list.slice().sort((a, b) => {
        const pa = priceNumber(a);
        const pb = priceNumber(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return direction * (pa - pb);
      });
    } else if (filter.sort === "name-asc") {
      list = list.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }
    return list;
  }, [products, filter]);

  const estimatedCommission = (p) => {
    const rate = parseFloat(String(rep?.rate ?? "").replace("%", ""));
    if (!Number.isFinite(rate) || rate <= 0) return "";
    const price = priceNumber(p);
    if (price == null || price <= 0) return "";
    return "≈ ₦" + Math.round((price * rate) / 100).toLocaleString("en-NG") + " commission";
  };

  const shareLink = (pid) =>
    `${window.location.origin}/product/${encodeURIComponent(pid)}?ref=${encodeURIComponent(rep.rep_id)}`;

  const copyText = async (text, btn) => {
    const original = btn.textContent;
    const done = () => {
      btn.classList.add("copied");
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = original;
      }, 2000);
    };
    try {
      await navigator.clipboard.writeText(text);
      done();
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e2) {}
      document.body.removeChild(ta);
    }
  };

  if (step === "login") {
    return (
      <div className="auth-shell">
        <section id="rep-login" className="auth-card">
          <div className="auth-brand">
            <a href="/" className="auth-logo" aria-label="Gifts by VF">
              <span>Gifts by V</span>
              <span className="brand-accent">F</span>
            </a>
            <span className="auth-brand-tag">Sales Rep Tools</span>
          </div>

          <p className="auth-eyebrow">Sales portal</p>
          <h1 className="auth-title">Rep sign in</h1>
          <p className="auth-hint">Enter your rep code and PIN to access your sales portal.</p>

          <form id="rep-form" className="auth-form" noValidate onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); login(e); }}>
            <label className="auth-field">
              <span className="auth-label">Rep code</span>
              <input
                type="text"
                id="rep-input"
                placeholder="Enter your rep code"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span className="auth-label">PIN</span>
              <span className="admin-pass-field">
                <input
                  type={showPin ? "text" : "password"}
                  id="rep-pin"
                  placeholder="Enter your PIN"
                  autoComplete="current-password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-pass-toggle"
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  aria-pressed={showPin}
                  title={showPin ? "Hide PIN" : "Show PIN"}
                  onClick={() => setShowPin((v) => !v)}
                >
                  <Icon name={showPin ? "eye-off" : "eye"} />
                </button>
              </span>
            </label>

            {error ? (
              <p id="rep-error" className="auth-error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? "Checking…" : "Continue"}
            </button>

            {pinStatus === "no-pin" ? (
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setError("");
                  setNewPin("");
                  setConfirmPin("");
                  setStep("setup-pin");
                }}
              >
                First time here? Set up your PIN
              </button>
            ) : null}
          </form>
        </section>
      </div>
    );
  }

  if (step === "setup-pin") {
    const displayName = rep?.name || rep?.rep_id || input;
    return (
      <div className="auth-shell">
        <section id="rep-setup-pin" className="auth-card">
          <div className="auth-brand">
            <a href="/" className="auth-logo" aria-label="Gifts by VF">
              <span>Gifts by V</span>
              <span className="brand-accent">F</span>
            </a>
            <span className="auth-brand-tag">Sales Rep Tools</span>
          </div>

          <p className="auth-eyebrow">First-time setup</p>
          <h1 className="auth-title">Set up your login PIN</h1>
          <p className="auth-hint">
            Welcome, <strong>{displayName}</strong>! Choose a secure PIN (at least
            4 characters) to protect your sales portal and track your payouts.
          </p>

          <form id="rep-setup-form" className="auth-form" noValidate onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); setupPin(e); }}>
            <label className="auth-field">
              <span className="auth-label">New PIN</span>
              <span className="admin-pass-field">
                <input
                  type={showNewPin ? "text" : "password"}
                  id="rep-new-pin"
                  placeholder="Create a new PIN (4+ characters)"
                  autoComplete="new-password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  className="admin-pass-toggle"
                  aria-label={showNewPin ? "Hide PIN" : "Show PIN"}
                  aria-pressed={showNewPin}
                  title={showNewPin ? "Hide PIN" : "Show PIN"}
                  onClick={() => setShowNewPin((v) => !v)}
                >
                  <Icon name={showNewPin ? "eye-off" : "eye"} />
                </button>
              </span>
            </label>

            <label className="auth-field">
              <span className="auth-label">Confirm PIN</span>
              <span className="admin-pass-field">
                <input
                  type={showConfirmPin ? "text" : "password"}
                  id="rep-confirm-pin"
                  placeholder="Confirm your new PIN"
                  autoComplete="new-password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  className="admin-pass-toggle"
                  aria-label={showConfirmPin ? "Hide PIN" : "Show PIN"}
                  aria-pressed={showConfirmPin}
                  title={showConfirmPin ? "Hide PIN" : "Show PIN"}
                  onClick={() => setShowConfirmPin((v) => !v)}
                >
                  <Icon name={showConfirmPin ? "eye-off" : "eye"} />
                </button>
              </span>
            </label>

            {error ? (
              <p id="rep-setup-error" className="auth-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              className="auth-submit"
              disabled={submitting}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await setupPin(e);
              }}
            >
              {submitting ? "Saving PIN…" : "Save PIN & Sign In"}
            </button>

            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setStep("login");
                setNewPin("");
                setConfirmPin("");
                setError("");
              }}
            >
              Back to sign in
            </button>
          </form>
        </section>
      </div>
    );
  }

  const mine = (payouts || []).filter(
    (r) => String(r.rep_id || "").trim().toLowerCase() === String(rep.rep_id).toLowerCase()
  );
  const pendingTotal = mine.reduce(
    (sum, r) => sum + (String(r.status || "").toLowerCase() === "paid" ? 0 : parseFloat(r.commission) || 0),
    0
  );
  const paidTotal = mine.reduce(
    (sum, r) => sum + (String(r.status || "").toLowerCase() === "paid" ? parseFloat(r.commission) || 0 : 0),
    0
  );
  const naira = (n) => "₦" + Math.round(n).toLocaleString("en-NG");
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const productCountText =
    payouts === undefined
      ? ""
      : `${products.length} ${products.length === 1 ? "product" : "products"} in catalogue · ${filteredProducts.length} ${
          filteredProducts.length === 1 ? "product matches" : "products match"
        } your filters`;

  return (
    <>
      {/* Sticky header: logo always; while logged in it also carries the
          session actions — notification bell + Start over (icon-only ≤640px). */}
      <header className="rep-header">
        <Link href="/" className="nav-logo" aria-label="Gifts by VF">
          <span className="brand-name">
            <span className="brand-text">Gifts by V</span>
            <span className="brand-accent">F</span>
          </span>
          <span className="nav-tagline">Bespoke Gifts</span>
        </Link>
        <div className="rep-header-actions">
          <span className="rep-header-name">{rep.name || rep.rep_id}</span>
          <div className="rep-bell-wrap" ref={bellRef}>
            <button
              type="button"
              className="rep-bell"
              onClick={() => setBellOpen((v) => !v)}
              aria-label={
                unreadCount > 0
                  ? `Notifications (${unreadCount} unread)`
                  : "Notifications"
              }
              aria-expanded={bellOpen}
              aria-haspopup="true"
            >
              <Icon name="bell" size={20} />
              {unreadCount > 0 ? (
                <span className="rep-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
              ) : null}
            </button>

            {bellOpen ? (
              <div className="rep-bell-panel">
                <div className="rep-bell-head">
                  <strong>Notifications</strong>
                  {unreadCount > 0 ? (
                    <button type="button" className="rep-bell-mark" onClick={markNotificationsRead}>
                      Mark all read
                    </button>
                  ) : null}
                </div>
                {notifications.length === 0 ? (
                  <p className="rep-bell-empty">
                    You&apos;re all caught up. New orders and closed deals will show here.
                  </p>
                ) : (
                  notifications.slice(0, 15).map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      className={`rep-bell-item${n.is_read ? "" : " unread"}`}
                      onClick={() => openNotification(n)}
                    >
                      <span className="rep-bell-dot" aria-hidden="true" />
                      <span className="rep-bell-item-text">
                        <strong>{n.title}</strong>
                        {n.body ? <span>{n.body}</span> : null}
                        <em>{notifTime(n.created_at)}</em>
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <button
            id="rep-logout"
            className="rep-btn rep-logout"
            type="button"
            onClick={logout}
            aria-label="Start over (sign out)"
            title="Start over"
          >
            <Icon name="logout" size={18} />
            <span className="rep-logout-label">Start over</span>
          </button>
        </div>
      </header>

      <section id="rep-dashboard" className="rep-dashboard">
      {pinNotice ? (
        <div
          className="rep-notice"
          style={{
            background: "rgba(201,169,110,0.15)",
            border: "1px solid var(--gold)",
            padding: "12px 18px",
            borderRadius: "10px",
            marginBottom: "18px",
            color: "var(--dark)",
            fontWeight: "500",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{pinNotice}</span>
          <button
            type="button"
            onClick={() => setPinNotice("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
              lineHeight: "1",
              padding: "0 6px",
              color: "inherit",
            }}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="rep-dashboard-intro">
        <div>
          <p className="section-label">Sales portal</p>
          <h2>Welcome back, <span id="rep-name">{rep.name || rep.rep_id}</span></h2>
          <p>Find a gift to share or check your latest commission activity.</p>
        </div>
      </div>

      <div className="rep-dashboard-layout">
        <aside className="rep-earnings-sidebar" aria-label="Your earnings">
          <div className="rep-earnings-card">
            <p className="section-label">Your performance</p>
            <h3>Commission overview</h3>
            <div className="rep-stats" id="rep-stats" aria-label="Commission summary">
              <div className="rep-stat">
                <span className="rep-stat-num" id="rep-stat-rate">{rateText}</span>
                <span className="rep-stat-label">Commission rate</span>
              </div>
              <div className="rep-stat">
                <span className="rep-stat-num" id="rep-stat-sales">{mine.length}</span>
                <span className="rep-stat-label">Confirmed sales</span>
              </div>
              <div className="rep-stat">
                <span className="rep-stat-num" id="rep-stat-pending">{naira(pendingTotal)}</span>
                <span className="rep-stat-label">Pending</span>
              </div>
              <div className="rep-stat">
                <span className="rep-stat-num" id="rep-stat-paid">{naira(paidTotal)}</span>
                <span className="rep-stat-label">Paid</span>
              </div>
            </div>
            <p id="rep-rule" className="rep-hint">{ruleText}</p>
            <p id="rep-credit" className="rep-hint">
              Any order placed through your links within {REP_CREDIT_WINDOW_DAYS} days of the
              buyer&apos;s first click is credited to you.
            </p>
          </div>
        </aside>

        <section className="rep-catalogue-panel" aria-labelledby="rep-products-title">
          <div className="rep-catalogue-heading">
            <p className="section-label">Product catalogue</p>
            <h3 id="rep-products-title">Your product links</h3>
            <p className="rep-hint">
              Copy a link and share it on WhatsApp, Instagram, or Facebook. Orders through your
              link earn you commission.
            </p>
          </div>
          <div className="rep-catalogue-toolbar">
            <div className="rep-catalogue-toolbar-row">
              <p id="rep-product-count" className="rep-product-count" role="status" aria-live="polite">
                {productCountText}
              </p>
              <label className="rep-filter-field rep-filter-search">
                <span>Search products</span>
                <input
                  type="search"
                  id="rep-product-search"
                  placeholder="Search by name, description, or material"
                  autoComplete="off"
                  value={filter.query}
                  onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
                />
              </label>
            </div>
            <details id="rep-product-filter-details" className="rep-filter-details" open>
              <summary>Filters and sorting</summary>
              <div className="rep-catalogue-controls" aria-label="Filter product links">
                <label className="rep-filter-field">
                  <span>Category</span>
                  <select
                    id="rep-product-category"
                    value={filter.category}
                    onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="all">All categories</option>
                    {categories.map((c) => (
                      <option key={c.toLowerCase()} value={c.toLowerCase()}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="rep-filter-field">
                  <span>Price</span>
                  <select
                    id="rep-product-price"
                    value={filter.price}
                    onChange={(e) => setFilter((f) => ({ ...f, price: e.target.value }))}
                  >
                    <option value="any">Any price</option>
                    <option value="under-20000">Under ₦20,000</option>
                    <option value="20000-50000">₦20,000–₦50,000</option>
                    <option value="above-50000">Above ₦50,000</option>
                  </select>
                </label>
                <label className="rep-filter-field">
                  <span>Occasion</span>
                  <select
                    id="rep-product-occasion"
                    value={filter.occasion}
                    onChange={(e) => setFilter((f) => ({ ...f, occasion: e.target.value }))}
                  >
                    <option value="all">All occasions</option>
                    {occasions.map((o) => (
                      <option key={o.toLowerCase()} value={o.toLowerCase()}>{o}</option>
                    ))}
                  </select>
                </label>
                <label className="rep-filter-field">
                  <span>Sort by</span>
                  <select
                    id="rep-product-sort"
                    value={filter.sort}
                    onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value }))}
                  >
                    <option value="featured">Catalogue order</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                  </select>
                </label>
                <button
                  type="button"
                  id="rep-product-clear"
                  className="rep-btn rep-btn-ghost rep-filter-clear"
                  onClick={() => setFilter({ query: "", category: "all", price: "any", occasion: "all", sort: "featured" })}
                >
                  Clear filters
                </button>
              </div>
            </details>
          </div>
          <div id="rep-products" className="rep-products-grid">
            {products.length === 0 ? (
              <p className="rep-empty">No products available yet.</p>
            ) : filteredProducts.length === 0 ? (
              <p className="rep-empty">No products match your filters.</p>
            ) : (
              filteredProducts.map((p, i) => {
                const pid =
                  String(p.slug || "").trim() || slugify(p.name) || String(p.display_order || i + 1);
                const link = shareLink(pid);
                const price = priceNumber(p) != null ? formatNaira(p.price) : "";
                const commission = estimatedCommission(p);
                const soldOut = isSoldOut(p);
                const stockLabel = soldOut ? String(p.stock_label || "").trim() || "Sold Out" : "";
                const img = validateUrl(directImageUrl(p.image_url));
                const initial = String(p.name || "?").trim().charAt(0).toUpperCase();
                const waShare = `https://wa.me/?text=${encodeURIComponent(link)}`;
                return (
                  <div
                    key={`${pid}-${i}`}
                    className={`rep-product${soldOut ? " is-soldout" : ""}`}
                    itemScope
                    itemType="https://schema.org/Product"
                  >
                    <div className={`rep-product-thumb${img ? "" : " no-image"}`}>
                      {img ? (
                        <SiteImage
                          src={img}
                          alt=""
                          sizes="64px"
                          legacyWidths={[96, 192, 320]}
                          onError={(e) => {
                            const el = e.currentTarget;
                            if (!el.dataset.retried) {
                              el.dataset.retried = "true";
                              el.removeAttribute("srcset");
                              el.src = img;
                            } else {
                              el.parentNode?.classList.add("no-image");
                            }
                          }}
                        />
                      ) : null}
                      <span className="rep-thumb-initial">{initial}</span>
                      {soldOut ? <span className="rep-stock-badge">{stockLabel}</span> : null}
                    </div>
                    <div className="rep-product-info">
                      <h4 itemProp="name">{p.name}</h4>
                      {price ? (
                        <span className="rep-product-price" itemProp="price" content={priceNumber(p)}>
                          From {price}
                        </span>
                      ) : null}
                      <p itemProp="description">{p.description || ""}</p>
                      {p.sales_caption ? <p className="rep-caption">{p.sales_caption}</p> : null}
                      {commission ? <span className="rep-commission">{commission}</span> : null}
                    </div>
                    <div className="rep-product-actions">
                      <button
                        type="button"
                        className="rep-copy-btn"
                        aria-label={`Copy share link for ${p.name}`}
                        onClick={(e) => copyText(link, e.currentTarget)}
                      >
                        Copy link
                      </button>
                      <a className="rep-share-btn" href={waShare} target="_blank" rel="noopener noreferrer">
                        WhatsApp
                      </a>
                      {canShare ? (
                        <button
                          type="button"
                          className="rep-share-btn"
                          onClick={() => navigator.share({ title: "Gifts by VF", url: link }).catch(() => {})}
                        >
                          Share
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <details id="rep-commission-history" className="rep-commission-history" open>
          <summary>
            <span>Commission history</span>
          </summary>
          <div className="rep-commission-history-content">
            {payoutsError ? (
              <p className="rep-hint">{payoutsError}</p>
            ) : (
              <>
                {mine.length === 0 ? (
                  <p className="rep-empty">
                    No commissions recorded yet. Sales you refer will appear here once the owner
                    confirms them.
                  </p>
                ) : null}
                <div className="rep-table-scroll">
                  <table id="rep-payouts" className={`rep-table${mine.length ? "" : " hidden"}`}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Order Amount</th>
                        <th>Commission</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mine.slice(0, payoutShown).map((r, i) => {
                        const status = String(r.status || "").toLowerCase();
                        const paid = status === "paid";
                        const closed = status === "closed";
                        return (
                          <tr key={i}>
                            <td data-label="Product">{r.product}</td>
                            <td data-label="Order amount">{naira(parseFloat(r.order_amount) || 0)}</td>
                            <td data-label="Commission">{naira(parseFloat(r.commission) || 0)}</td>
                            <td data-label="Status">
                              <span
                                className={`rep-status ${paid ? "paid" : closed ? "closed" : "pending"}`}
                              >
                                {paid ? "Paid" : closed ? "Closed" : "Pending"}
                              </span>
                            </td>
                            <td data-label="Date">{r.date}</td>
                          </tr>
                        );
                      })}
                      {mine.length > payoutShown ? (
                        <tr className="rep-showall-row">
                          <td colSpan={5}>
                            <button
                              type="button"
                              className="rep-showall"
                              onClick={() => setPayoutShown(mine.length)}
                            >
                              Show all commissions ({mine.length - payoutShown} more)
                            </button>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </details>
      </div>
      </section>

      {/* Transient banner so a rep browsing the catalogue can't miss a new
          order/deal even without looking at the bell. Tap = same as bell item. */}
      {toast ? (
        <button
          type="button"
          className="rep-toast"
          onClick={() => {
            setToast(null);
            openNotification(toast);
          }}
        >
          <Icon name="bell" size={18} />
          <span className="rep-toast-text">
            <strong>{toast.title}</strong>
            {toast.body ? <span>{toast.body}</span> : null}
          </span>
        </button>
      ) : null}
    </>
  );
}
