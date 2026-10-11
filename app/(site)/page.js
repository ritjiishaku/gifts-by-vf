import {
  getSettings,
  getProducts,
  getPortfolio,
  getWhyUs,
  getTestimonials,
  getHowToOrder,
  getFaqs,
} from "@/lib/data";
import { settingsFromRows, DEFAULTS, SITE_URL } from "@/lib/site";
import { filterAndSort, priceNumber, isSoldOut, directImageUrl, validateUrl, slugify } from "@/lib/format";
import { TAXONOMY } from "@/lib/taxonomy";
import { Hero } from "@/components/Hero";
import { Catalogue } from "@/components/Catalogue";
import { Section } from "@/components/Section";
import { Portfolio } from "@/components/Portfolio";
import { WhyUs } from "@/components/WhyUs";
import { Testimonials } from "@/components/Testimonials";
import { HowToOrder } from "@/components/HowToOrder";
import { Faq } from "@/components/Faq";

export const revalidate = 60;

const DEFAULT_HERO_IMAGE = "https://lh3.googleusercontent.com/d/1I2iMEg47s7_ik0trBhvqbgrJIBQmFIBB";

export async function generateMetadata() {
  const rows = await getSettings();
  const settings = settingsFromRows(rows);
  const title = settings.site_title || `${DEFAULTS.brand_name}${DEFAULTS.brand_accent} — ${DEFAULTS.hero_title}`;
  return {
    title,
    description: settings.hero_desc || DEFAULTS.hero_desc,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description: settings.hero_desc || DEFAULTS.hero_desc,
      url: "/",
      images: [{ url: DEFAULT_HERO_IMAGE }],
    },
  };
}

export default async function HomePage() {
  const [settingsRows, productRows, portfolioRows, whyRows, testimonialRows, howtoRows, faqRows] =
    await Promise.all([
      getSettings(),
      getProducts(),
      getPortfolio(),
      getWhyUs(),
      getTestimonials(),
      getHowToOrder(),
      getFaqs(),
    ]);

  const settings = settingsFromRows(settingsRows);
  const products = filterAndSort(productRows);
  const portfolio = filterAndSort(portfolioRows);
  const whyUs = filterAndSort(whyRows);
  const testimonials = filterAndSort(testimonialRows);
  const howTo = filterAndSort(howtoRows);
  const faqs = filterAndSort(faqRows);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.slice(0, 100).map((p, index) => {
      const img = validateUrl(directImageUrl(p.image_url));
      const item = { "@type": "Product", name: p.name, url: `${SITE_URL}/product/${encodeURIComponent(slugify(p.name))}` };
      if (p.description) item.description = p.description;
      if (img) item.image = [img];
      const price = priceNumber(p);
      if (price != null && price > 0) {
        item.offers = {
          "@type": "Offer",
          priceCurrency: "NGN",
          price,
          availability: isSoldOut(p) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        };
      }
      return { "@type": "ListItem", position: index + 1, item };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Hero settings={settings} products={products} taxonomy={TAXONOMY} />

      <Section id="products">
        <Catalogue products={products} taxonomy={TAXONOMY} settings={settings} />
      </Section>

      <Portfolio label={settings.portfolio_label} title={settings.portfolio_title} rows={portfolio} />
      <WhyUs
        label={settings.why_label}
        title={settings.why_title}
        desc={settings.why_desc}
        rows={whyUs}
      />
      <Testimonials
        label={settings.testimonials_label}
        title={settings.testimonials_title}
        rows={testimonials}
        moreLabel={settings.testimonials_more_label}
      />
      <HowToOrder
        label={settings.howto_label}
        title={settings.howto_title}
        rows={howTo}
        defaults={DEFAULTS.howto_steps}
        settings={settings}
      />
      <Faq label={settings.faq_label} title={settings.faq_title} rows={faqs} />
    </>
  );
}
