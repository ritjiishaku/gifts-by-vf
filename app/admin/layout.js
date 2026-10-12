import Link from "next/link";

export const metadata = {
  title: "Admin",
  robots: { index: false },
};

export default function AdminLayout({ children }) {
  return (
    <div className="page-shell">
      <header className="rep-header">
        <Link href="/" className="nav-logo" aria-label="Gifts by VF">
          <span className="brand-name">
            <span className="brand-text">Gifts by V</span>
            <span className="brand-accent">F</span>
          </span>
          <span className="nav-tagline">Bespoke Gifts</span>
        </Link>
        <span className="rep-tag">Owner Admin</span>
      </header>
      <main className="admin-page">{children}</main>
    </div>
  );
}
