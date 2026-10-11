export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://giftsbyvf.vercel.app";

export const DEFAULT_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2348127252004";

export const SITE_NAME = "Gifts by VF";
export const SITE_TAGLINE = "Bespoke Gifts";
export const DEFAULT_DESCRIPTION =
  "Personalised jewellery, acrylic keepsakes and custom gifts — made for birthdays, weddings and every moment in between.";

export const DEFAULTS = {
  whatsapp_number: DEFAULT_WHATSAPP,
  site_title: "Gifts by VF — Handcrafted & Bespoke Gifts",
  brand_name: "Gifts by V",
  brand_accent: "F",
  hero_label: "Handmade • Personalised • Delivered",
  hero_title: "Gifts they’ll actually remember.",
  hero_desc: DEFAULT_DESCRIPTION,
  products_label: "Gift Collection",
  products_title: "Choose the perfect gift",
  products_desc:
    "From personalised keepsakes to statement jewellery and meaningful gifting moments, discover pieces made to celebrate the people you love.",
  featured_label: "Bestsellers",
  featured_title: "Most-loved gifts",
  why_label: "Why VF",
  why_title: "Why People Choose Us",
  why_desc: "Handcrafted with care, delivered with love.",
  testimonials_label: "Kind Words",
  testimonials_title: "What Our Customers Say",
  portfolio_label: "Recent Moments",
  portfolio_title: "Some of what we've made",
  howto_label: "Simple & Easy",
  howto_title: "How to Order",
  howto_kicker: "Easy gifting flow",
  howto_summary: "Choose a gift, share the details, and we'll make the rest simple.",
  howto_badges: "Pick your gift\nShare your details\nApprove & order",
  howto_cta_text:
    "Tell us what you're looking for and we'll help you pick a meaningful gift that feels personal.",
  howto_cta_label: "Start your order",
  howto_steps: [
    {
      title: "Find what you love",
      description:
        "Use the search bar to browse by keyword, category, or occasion and find the perfect gift for your moment.",
    },
    {
      title: "Choose your favourite",
      description:
        "Browse the catalogue, compare styles, and pick the piece that feels most personal and meaningful.",
    },
    {
      title: "Send your custom details",
      description:
        "Tap the WhatsApp button and send us the name, initials, photo, text, or custom details you want included.",
    },
    {
      title: "Confirm & pay",
      description:
        "We’ll confirm the design, final details, and pricing with you before payment is completed.",
    },
    {
      title: "We create & deliver",
      description:
        "Leave the rest to us and we’ll craft your gift with care and deliver it to you with love.",
    },
  ],
  faq_label: "Good to Know",
  faq_title: "Before You Order",
  testimonials_more_label: "See more from our customers",
  footer_cta_title: "Ready to order?",
  footer_cta_desc:
    "Tell us what you have in mind and we'll help you craft a gift that feels personal.",
  footer_cta_label: "Chat with us on WhatsApp",
  nav_tagline: "Bespoke Gifts",
  nav_wa_label: "WhatsApp Us",
  footer_text: `© ${new Date().getFullYear()} Gifts by VF. All rights reserved.`,
};

export function settingsFromRows(rows) {
  const settings = { ...DEFAULTS };
  if (Array.isArray(rows)) {
    rows.forEach((row) => {
      if (row && row.key && row.value) settings[row.key] = row.value;
    });
  }
  return settings;
}

export function waNumber(settings) {
  const raw = (settings && settings.whatsapp_number) || DEFAULT_WHATSAPP;
  return String(raw).replace(/[^0-9]/g, "");
}

export function waLink(settings, message) {
  const num = waNumber(settings);
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${num}${text}`;
}
