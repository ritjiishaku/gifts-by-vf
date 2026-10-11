import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-hero">
      <div className="page-hero-copy">
        <p className="section-label">404 — page not found</p>
        <h1>That page can&apos;t be found</h1>
        <p>
          The link may be out of date, or the item may no longer be available.
          Browse the catalogue to find your gift.
        </p>
        <Link href="/#products" className="product-order-btn">
          <span>Browse the full catalogue</span>
        </Link>
      </div>
    </section>
  );
}