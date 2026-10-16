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
  );
}
