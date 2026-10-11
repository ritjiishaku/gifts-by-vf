"use client";

import { useState } from "react";
import { starRating } from "@/lib/format";

const TESTIMONIAL_LIMIT = 6;

export function Testimonials({ label, title, rows, moreLabel }) {
  const [expanded, setExpanded] = useState(false);

  if (!rows || rows.length === 0) return null;

  const visible = expanded ? rows : rows.slice(0, TESTIMONIAL_LIMIT);
  const hasMore = rows.length > TESTIMONIAL_LIMIT;

  const card = (row, i) => {
    const stars = starRating(row.rating);
    const rated = stars.split("☆")[0].length;
    const byline = [row.name, row.source].filter(Boolean).join(" · ");
    return (
      <figure key={row.id || i} className="testimonial-card">
        <div
          className="stars"
          role="img"
          aria-label={rated ? `Rated ${rated} out of 5 stars` : "No rating"}
        >
          {stars}
        </div>
        <blockquote>{row.quote}</blockquote>
        {byline ? <figcaption>— {byline}</figcaption> : null}
      </figure>
    );
  };

  return (
    <section id="testimonials" className="side-section alt fade-in">
      <div className="section-inner">
        <div className="catalogue-header">
          <p className="section-label" id="testimonials-label">{label}</p>
          <h2 className="section-title" id="testimonials-title">{title}</h2>
        </div>
        <div className="testimonials-track fade-in" id="testimonials-grid">
          {visible.map(card)}
        </div>
        <div className="testimonials-more fade-in" id="testimonials-more" hidden={!hasMore}>
          <button
            type="button"
            className="testimonials-more-btn"
            aria-expanded={expanded}
            onClick={() => setExpanded(true)}
          >
            {moreLabel || "See more from our customers"}
          </button>
        </div>
      </div>
    </section>
  );
}
