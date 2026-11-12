import taxonomyJson from "./taxonomy.json";

export const TAXONOMY = Array.isArray(taxonomyJson.categories) ? taxonomyJson.categories : [];

export function normalizeTaxonomyText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/customised/g, "customized")
    .replace(/customise/g, "customize")
    .replace(/jewellery/g, "jewelry")
    .replace(/wrist\s*watch/g, "watch")
    .replace(/t[ -]?shirt/g, "tshirt")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function taxonomyCategoryForProduct(product, taxonomy = TAXONOMY) {
  if (!product || !taxonomy || !taxonomy.length) return null;
  const categoryText = normalizeTaxonomyText(product.category);
  const titleText = normalizeTaxonomyText(product.name);
  const match = taxonomy.find((category) => {
    const names = [category.name, ...(category.legacyAliases || [])].map(normalizeTaxonomyText);
    if (names.includes(categoryText)) return true;
    if (categoryText === "") {
      return titleText && names.some((value) => value && titleText.includes(value));
    }
    // Avoid overly broad matching for very short aliases
    return names.some((value) => value && value.length >= 4 && categoryText.includes(value));
  });
  if (match) return match;
  const productText = normalizeTaxonomyText([product.category, product.name].join(" "));
  if (/jewel|necklace|bracelet|cufflink|anklet|ring|waist chain/.test(productText)) {
    return taxonomy.find((category) => category.name === "Customized Jewelry") || null;
  }
  if (/signage|neon|indoor sign/.test(productText)) {
    return taxonomy.find((category) => category.name === "Brand Signages") || null;
  }
  // Books are listed inside the More to Love collection.
  if (/\b(books?|bibles?|devotionals?|hymnals?|hymns?|sermons?|church books?|christian books?|faith books?)\b/.test(productText)) {
    return taxonomy.find((category) => category.name === "More to Love") || null;
  }
  if (/picture|acrylic|frame|frameless|enlargement/.test(productText)) {
    return taxonomy.find((category) => category.name === "Picture Enlargement") || null;
  }
  return taxonomy.find((category) => category.name === "More to Love") || null;
}

export function taxonomySubcategoryForProduct(product, taxonomy = TAXONOMY) {
  const category = taxonomyCategoryForProduct(product, taxonomy);
  const explicit = String((product && product.subcategory) || "").trim();
  if (
    explicit &&
    (!category ||
      !(category.subcategories || []).length ||
      category.subcategories.some((group) => group.name.toLowerCase() === explicit.toLowerCase()))
  ) {
    return explicit;
  }
  if (!category || !Array.isArray(category.subcategories)) return "";
  const text = normalizeTaxonomyText([product.name, product.description].join(" "));
  if (category.name === "Customized Jewelry") {
    return text.includes("engraved") ? "Engraved" : "Carved / Customized";
  }
  if (category.name === "Brand Signages") {
    return text.includes("neon") ? "Neon Signages" : "Shaped Indoor Signages";
  }
  return "";
}

export function taxonomyProductTypes(category) {
  if (!category) return [];
  if (Array.isArray(category.subcategories) && category.subcategories.length) {
    return category.subcategories.flatMap((group) => group.productTypes || []);
  }
  return category.productTypes || [];
}

export function taxonomyProductTypeForProduct(product, taxonomy = TAXONOMY) {
  const explicit = String((product && product.product_type) || "").trim();
  if (explicit) return explicit;
  const category = taxonomyCategoryForProduct(product, taxonomy);
  const title = normalizeTaxonomyText(product && product.name);
  if (!category || !title) return String((product && product.name) || "").trim();
  if (category.name === "Picture Enlargement" && title.includes("non acrylic")) {
    return String(product.name || "").trim();
  }
  const choices = taxonomyProductTypes(category)
    .slice()
    .sort((a, b) => b.name.length - a.name.length);
  for (const choice of choices) {
    const matchValues = [choice.name, ...(choice.aliases || [])]
      .map(normalizeTaxonomyText)
      .filter(Boolean);
    if (matchValues.some((value) => title.includes(value))) return choice.name;
  }
  return String(product.name || "").trim();
}
