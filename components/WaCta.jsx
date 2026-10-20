"use client";

import { useEffect, useState } from "react";
import { waLink } from "@/lib/site";
import { WaIcon } from "./icons";
import { getReferral, subscribeReferral } from "./referral-store";

const DEFAULT_MESSAGE = "Hello! I would love to place an order with Gifts by VF.";

export function WaCta({ settings, className, id, label, ariaLabel, message }) {
  const [ref, setRef] = useState(getReferral);
  useEffect(() => {
    setRef(getReferral());
    return subscribeReferral(() => setRef(getReferral()));
  }, []);

  const base = message || DEFAULT_MESSAGE;
  const text = ref && ref.name ? `${base} I was referred by ${ref.name}.` : base;

  return (
    <a
      href={waLink(settings, text)}
      id={id}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
    >
      <WaIcon />
      <span>{label}</span>
    </a>
  );
}