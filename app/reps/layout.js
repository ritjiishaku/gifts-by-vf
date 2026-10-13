import Link from "next/link";

export const metadata = {
  title: "Sales Rep Tools",
  robots: { index: false },
};

export default function RepsLayout({ children }) {
  return (
    <div className="page-shell">
      <header className="rep-header">
        <Link href="/#products" className="nav-logo" aria-label="Gifts by VF">
          <span className="brand-name">
            <span className="brand-text">Gifts by V</span>
            <span className="brand-accent">F</span>
          </span>
          <span className="nav-tagline">Bespoke Gifts</span>
        </Link>
        <span className="rep-tag">Sales Rep Tools</span>
      </header>
      <main className="rep-page-shell">{children}</main>
    </div>
  );
}
