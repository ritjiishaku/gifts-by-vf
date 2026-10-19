export const metadata = {
  title: "Sales Rep Tools",
  robots: { index: false },
};

// The sticky header now lives inside RepPortal (client component) so it can
// hold session-aware actions — the notification bell and "Start over" — once
// a rep is logged in. It's hidden on the auth screens via
// `.page-shell:has(.auth-shell) .rep-header`.
export default function RepsLayout({ children }) {
  return (
    <div className="page-shell">
      <main className="rep-page-shell">{children}</main>
    </div>
  );
}
