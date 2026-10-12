import { cookies } from "next/headers";
import { verifySessionCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { getSettings, getAll, getReps } from "@/lib/data";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authed = verifySessionCookieValue(cookieStore.get(SESSION_COOKIE)?.value);

  if (!authed) {
    return <AdminLogin />;
  }

  const [settings, products, reps, testimonials, portfolio, whyUs, howTo, faqs] =
    await Promise.all([
      getSettings(),
      getAll("products"),
      getReps(),
      getAll("testimonials"),
      getAll("portfolio"),
      getAll("why_us"),
      getAll("how_to_order"),
      getAll("faqs"),
    ]);

  return (
    <>
      <section className="page-hero admin-hero">
        <div className="page-hero-copy">
          <p className="section-label">Owner area</p>
          <h1>Manage your gift catalogue</h1>
          <p>Update products, reps and site content from one polished admin area.</p>
        </div>
        <div className="gift-chips" aria-label="Admin focus areas">
          <span>Settings</span>
          <span>Products</span>
          <span>Reps</span>
        </div>
      </section>
      <AdminDashboard
        settings={settings}
        products={products}
        reps={reps}
        testimonials={testimonials}
        portfolio={portfolio}
        whyUs={whyUs}
        howTo={howTo}
        faqs={faqs}
      />
    </>
  );
}
