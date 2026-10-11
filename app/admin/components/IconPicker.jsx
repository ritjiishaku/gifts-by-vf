"use client";

import { useState } from "react";
import { Icon, ICON_NAMES } from "@/components/icons";

function humanize(name) {
  return String(name || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function IconPicker({ name, value = "", hint = "Icon shown on the card." }) {
  const [icon, setIcon] = useState(String(value || "").trim().toLowerCase() || "star");
  return (
    <label className="admin-field admin-field-wide">
      Icon
      <div className="admin-icon-picker">
        <span className="why-icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
        <select name={name} value={icon} onChange={(e) => setIcon(e.target.value)}>
          {ICON_NAMES.map((key) => (
            <option key={key} value={key}>
              {humanize(key)}
            </option>
          ))}
        </select>
      </div>
      <span className="admin-field-hint">{hint}</span>
    </label>
  );
}