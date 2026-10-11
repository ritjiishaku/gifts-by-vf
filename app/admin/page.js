import { cookies } from "next/headers";
import { verifySessionCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { getSettings, getAll, getReps } from "@/lib/data";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authed = verifySessionCookieValue(cookieStore.get(SESSION_COOKIE)?.value);

  if (!authed) {
    return (
      <section className="admin-section">
        <AdminLogin />
      </section>
    );
  }

  const [settings, products, reps, testimonials] = await Promise.all([
    getSettings(),
    getAll("products"),
    getReps(),
    getAll("testimonials"),
  ]);

  return <AdminDashboard settings={settings} products={products} reps={reps} testimonials={testimonials} />;
}
