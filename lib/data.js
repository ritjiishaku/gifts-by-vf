import { supabase } from "./supabase";
import { slugify } from "./format";

const REVALIDATE = 60;

async function fetchAll(table, { visibleOnly = true, order = true } = {}) {
  try {
    let query = supabase().from(table).select("*");
    if (visibleOnly) query = query.neq("is_visible", false);
    if (order) {
      query = query
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });
    }
    const { data, error } = await query;
    if (error) {
      console.error(`[data] ${table}:`, error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(`[data] ${table}:`, err.message);
    return [];
  }
}

export async function getSettings() {
  try {
    const { data, error } = await supabase()
      .from("site_settings")
      .select("key,value");
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[data] site_settings:", err.message);
    return [];
  }
}

export const getProducts = () => fetchAll("products");
export const getPortfolio = () => fetchAll("portfolio");
export const getWhyUs = () => fetchAll("why_us");
export const getTestimonials = () => fetchAll("testimonials");
export const getHowToOrder = () => fetchAll("how_to_order");
export const getFaqs = () => fetchAll("faqs");

export async function getReps() {
  try {
    // Admin list only — never select pin_hash here so it can't reach the client.
    const { data, error } = await supabase()
      .from("sales_reps")
      .select("id,rep_id,name,commission_rate,is_active");
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[data] sales_reps:", err.message);
    return [];
  }
}

// Public-safe subset: no commission_rate or other internal fields. Used by the
// site layout / referral banner, which only needs rep_id -> display name.
export async function getPublicReps() {
  try {
    const { data, error } = await supabase()
      .from("sales_reps")
      .select("rep_id,name,is_active");
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[data] sales_reps (public):", err.message);
    return [];
  }
}

export async function getProductBySlug(slug) {
  const clean = slugify(slug);
  if (!clean) return null;
  try {
    const { data, error } = await supabase()
      .from("products")
      .select("*")
      .eq("slug", clean)
      .neq("is_visible", false)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error("[data] product:", err.message);
    return null;
  }
}

export async function getRepByRepId(repId) {
  const clean = String(repId || "").trim().toLowerCase();
  if (!clean) return null;
  try {
    const { data, error } = await supabase()
      .from("sales_reps")
      .select("rep_id,name,commission_rate,is_active,pin_hash")
      .ilike("rep_id", clean)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error("[data] rep:", err.message);
    return null;
  }
}

export async function getRepDashboard(repId) {
  const rep = await getRepByRepId(repId);
  if (!rep) return null;
  try {
    const { data, error } = await supabase()
      .from("payouts")
      .select("*")
      .ilike("rep_id", String(rep.rep_id || "").trim())
      .order("id", { ascending: false });
    if (error) throw error;
    return { rep, payouts: data || [] };
  } catch (err) {
    console.error("[data] payouts:", err.message);
    return { rep, payouts: [] };
  }
}

export async function getAll(table) {
  return fetchAll(table, { visibleOnly: false, order: true });
}
