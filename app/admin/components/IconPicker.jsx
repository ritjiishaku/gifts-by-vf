"use client";

import { useMemo, useState } from "react";
import { Icon, ICON_NAMES } from "@/components/icons";

function humanize(name) {
  return String(name || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function IconPicker({
  name,
  value = "",
  hint = "Icon shown on the card.",
  allowNone = false,
}) {
  const initial = String(value || "").trim().toLowerCase();
  const [icon, setIcon] = useState(initial || (allowNone ? "" : "star"));
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return ICON_NAMES;
    return ICON_NAMES.filter((key) => {
      const label = humanize(key).toLowerCase();
      return key.includes(q) || label.includes(q);
    });
  }, [q]);

  const showNone = allowNone && !q;

  return (
    <div className="admin-field admin-field-wide">
      <span className="admin-field-label">Icon</span>
      {/* Keeps the form submission identical to the old <select name={name}>. */}
      <input type="hidden" name={name} value={icon} />

      <div className="admin-icon-picker">
        <span className="admin-icon-current" title={icon ? humanize(icon) : "None"}>
          {icon ? (
            <span className="why-icon" aria-hidden="true">
              <Icon name={icon} />
            </span>
          ) : (
            <span className="admin-icon-none-mark" aria-hidden="true">
              –
            </span>
          )}
          <span className="admin-icon-current-name">{icon ? humanize(icon) : "None"}</span>
        </span>
        <input
          type="search"
          className="admin-icon-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons (e.g. gift, ship, heart)…"
          aria-label="Search icons"
        />
      </div>

      <div className="admin-icon-grid" role="listbox" aria-label="Choose an icon">
        {showNone ? (
          <button
            type="button"
            role="option"
            aria-selected={icon === ""}
            title="None"
            className={`admin-icon-option${icon === "" ? " is-selected" : ""}`}
            onClick={() => setIcon("")}
          >
            <span className="admin-icon-none-mark" aria-hidden="true">
              –
            </span>
            <span className="admin-icon-option-label">None</span>
          </button>
        ) : null}

        {matches.map((key) => (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={key === icon}
            title={humanize(key)}
            className={`admin-icon-option${key === icon ? " is-selected" : ""}`}
            onClick={() => setIcon(key)}
          >
            <Icon name={key} size={22} />
            <span className="admin-icon-option-label">{humanize(key)}</span>
          </button>
        ))}

        {matches.length === 0 ? (
          <p className="admin-icon-empty">
            No icons match {query ? `“${query}”` : "your search"}.
          </p>
        ) : null}
      </div>

      <span className="admin-field-hint">{hint}</span>
    </div>
  );
}
