"use client";

import { useEffect, useState } from "react";
import { WaCta } from "./WaCta";

export function Navbar({ brandName, brandAccent, settings }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav id="navbar" className={scrolled ? "scrolled" : ""}>
      <div className="nav-inner">
        <a href="#hero" className="nav-logo" aria-label="Gifts by VF">
          <span className="brand-name">
            <span className="brand-text">{brandName || "Gifts by V"}</span>
            <span className="brand-accent">{brandAccent || "F"}</span>
          </span>
          <span className="nav-tagline">Bespoke Gifts</span>
        </a>
        <div className="nav-actions">
          <WaCta
            settings={settings}
            id="nav-wa-btn"
            className="nav-wa-btn"
            label="WhatsApp Us"
            ariaLabel="Chat with Gifts by VF on WhatsApp"
          />
        </div>
      </div>
    </nav>
  );
}
