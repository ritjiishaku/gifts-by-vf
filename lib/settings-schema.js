export const SETTINGS_GROUPS = [
  {
    title: "Brand & identity",
    fields: [
      { key: "site_title", label: "Browser tab title", wide: true, placeholder: "Gifts by VF — Handcrafted & Bespoke Gifts" },
      { key: "brand_name", label: "Brand name", placeholder: "e.g. Gifts by V" },
      { key: "brand_accent", label: "Brand accent letter", placeholder: "e.g. F (the highlighted letter)" },
      { key: "nav_tagline", label: "Navbar badge text", placeholder: "Bespoke Gifts" },
      { key: "nav_wa_label", label: "Navbar WhatsApp button", placeholder: "WhatsApp Us" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "whatsapp_number", label: "WhatsApp number (digits only)", placeholder: "2348012345678 (country code, no +)" },
    ],
  },
  {
    title: "Homepage hero",
    fields: [
      { key: "hero_label", label: "Small label", placeholder: "Handmade • Personalised • Delivered" },
      { key: "hero_title", label: "Headline", placeholder: "Gifts they'll actually remember." },
      { key: "hero_desc", label: "Description", type: "textarea", wide: true, placeholder: "Personalised jewellery, acrylic keepsakes and custom gifts — made for every moment." },
      { key: "hero_image_url", label: "Hero image URL", wide: true, placeholder: "Paste an image link or Google Drive share link" },
    ],
  },
  {
    title: "Catalogue",
    fields: [
      { key: "products_label", label: "Small label", placeholder: "Gift Collection" },
      { key: "products_title", label: "Heading", placeholder: "Choose the perfect gift" },
      { key: "products_desc", label: "Description", type: "textarea", wide: true, placeholder: "From personalised keepsakes to statement jewellery, discover pieces made to celebrate the people you love." },
      { key: "featured_label", label: "Featured small label", placeholder: "Bestsellers" },
      { key: "featured_title", label: "Featured heading", placeholder: "Most-loved gifts" },
    ],
  },
  {
    title: "Why people come back",
    fields: [
      { key: "why_label", label: "Small label", placeholder: "Why VF" },
      { key: "why_title", label: "Heading", placeholder: "Why People Choose Us" },
      { key: "why_desc", label: "Description", type: "textarea", wide: true, placeholder: "Handcrafted with care, delivered with love." },
    ],
  },
  {
    title: "Testimonials",
    fields: [
      { key: "testimonials_label", label: "Small label", placeholder: "Kind Words" },
      { key: "testimonials_title", label: "Heading", placeholder: "What Our Customers Say" },
      { key: "testimonials_more_label", label: "“See more” button label", placeholder: "See more from our customers" },
    ],
  },
  {
    title: "Portfolio",
    fields: [
      { key: "portfolio_label", label: "Small label", placeholder: "Recent Moments" },
      { key: "portfolio_title", label: "Heading", placeholder: "Some of what we've made" },
    ],
  },
  {
    title: "How to order",
    fields: [
      { key: "howto_label", label: "Small label", placeholder: "Simple & Easy" },
      { key: "howto_title", label: "Heading", placeholder: "How to Order" },
      { key: "howto_kicker", label: "Kicker badge", placeholder: "Easy gifting flow" },
      { key: "howto_summary", label: "Intro line", type: "textarea", wide: true, placeholder: "Choose a gift, share the details, and we'll make the rest simple." },
      { key: "howto_badges", label: "Badge chips (one per line)", type: "textarea", wide: true, placeholder: "Pick your gift\nShare your details\nApprove & order" },
      { key: "howto_cta_text", label: "CTA paragraph", type: "textarea", wide: true, placeholder: "Tell us what you're looking for and we'll help you pick a meaningful gift." },
      { key: "howto_cta_label", label: "CTA button label", placeholder: "Start your order" },
    ],
  },
  {
    title: "FAQ",
    fields: [
      { key: "faq_label", label: "Small label", placeholder: "Good to Know" },
      { key: "faq_title", label: "Heading", placeholder: "Before You Order" },
    ],
  },
  {
    title: "Category images",
    fields: [
      { key: "category_picture_enlargement_image_url", label: "Picture Enlargement", wide: true, placeholder: "Paste an image link or Google Drive share link" },
      { key: "category_customized_jewelry_image_url", label: "Customized Jewelry", wide: true, placeholder: "Paste an image link or Google Drive share link" },
      { key: "category_brand_signages_image_url", label: "Brand Signages", wide: true, placeholder: "Paste an image link or Google Drive share link" },
      { key: "category_more_to_love_image_url", label: "More to Love", wide: true, placeholder: "Paste an image link or Google Drive share link" },
    ],
  },
  {
    title: "Sales reps",
    fields: [
      { key: "commission_rule", label: "Commission line shown to reps", wide: true, placeholder: "e.g. 10% commission on every sale" },
    ],
  },
  {
    title: "Footer",
    fields: [
      { key: "footer_cta_title", label: "CTA heading", placeholder: "Ready to order?" },
      { key: "footer_cta_desc", label: "CTA paragraph", type: "textarea", wide: true, placeholder: "Tell us what you have in mind and we'll help you craft a gift that feels personal." },
      { key: "footer_cta_label", label: "CTA button label", placeholder: "Chat with us on WhatsApp" },
      { key: "footer_text", label: "Footer text", wide: true, placeholder: "© 2026 Gifts by VF. All rights reserved." },
    ],
  },
];

export const SETTINGS_KEYS = SETTINGS_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.key)
);
