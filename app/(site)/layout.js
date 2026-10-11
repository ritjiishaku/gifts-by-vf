import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ReferralBanner } from "@/components/ReferralBanner";
import { getSettings, getPublicReps } from "@/lib/data";
import { settingsFromRows } from "@/lib/site";

export default async function SiteLayout({ children }) {
  const [settingsRows, reps] = await Promise.all([getSettings(), getPublicReps()]);
  const settings = settingsFromRows(settingsRows);

  return (
    <>
      <Navbar brandName={settings.brand_name} brandAccent={settings.brand_accent} settings={settings} />
      <ReferralBanner reps={reps} />
      <main>{children}</main>
      <Footer text={settings.footer_text} settings={settings} />
    </>
  );
}
