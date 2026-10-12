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

  return <RepPortal products={products} commissionRule={commissionRule} />;
}
