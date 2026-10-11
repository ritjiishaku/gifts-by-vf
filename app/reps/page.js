import { getProducts, getSettings } from "@/lib/data";
import { settingsFromRows } from "@/lib/site";
import { filterAndSort } from "@/lib/format";
import { RepPortal } from "@/components/reps/RepPortal";

export const revalidate = 60;

export default async function RepsPage() {
  const [productRows, settingsRows] = await Promise.all([
    getProducts(),
    getSettings(),
  ]);
  const products = filterAndSort(productRows);
  const settings = settingsFromRows(settingsRows);
  const commissionRule = settings.commission_rule || "";

  return (
    <>
      <section className="page-hero rep-hero">
        <div className="page-hero-copy">
          <p className="section-label">Sales portal</p>
          <h1>Share gifts and track commission</h1>
          <p>Login with your rep code to get personalised product links and monitor your confirmed sales.</p>
        </div>
        <div className="gift-chips" aria-label="Rep features">
          <span>Share links</span>
          <span>Track payouts</span>
          <span>Earn commission</span>
        </div>
      </section>

      <RepPortal products={products} commissionRule={commissionRule} />
    </>
  );
}
