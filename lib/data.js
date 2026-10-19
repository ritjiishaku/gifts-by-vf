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
    // Select pin_hash on server and map to a boolean so hashes never reach the client.
    const { data, error } = await supabase()
      .from("sales_reps")
      .select("id,rep_id,name,commission_rate,is_active,pin_hash");
    if (error) throw error;
    return (data || []).map(({ pin_hash, ...r }) => ({
      ...r,
      has_pin: Boolean(pin_hash),
    }));
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
    if (data) return data;
    // Fallback: share/copy/rep links are built from slugify(name). If the stored
    // slug is NULL, stale, or a product was renamed, match on the slugified name
    // so product links keep working (catalogue is small, so a JS sweep is fine).
    const { data: all, error: allError } = await supabase()
      .from("products")
      .select("*")
      .neq("is_visible", false);
    if (allError) throw allError;
    return (all || []).find((p) => slugify(p.name) === clean) || null;
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
      .select("id,rep_id,name,commission_rate,is_active,pin_hash")
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
    return { rep, payouts: data || [], notifications: await getRepNotifications(rep.rep_id) };
  } catch (err) {
    console.error("[data] payouts:", err.message);
    return { rep, payouts: [], notifications: await getRepNotifications(rep.rep_id) };
  }
}

// All payouts for the admin Orders tab (newest first).
export async function getPayouts() {
  try {
    const { data, error } = await supabase()
      .from("payouts")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[data] payouts (admin):", err.message);
    return [];
  }
}

// A rep's notifications, newest first. Matches the payouts query style (ilike)
// so case differences in rep_id never hide alerts.
export async function getRepNotifications(repId, { unreadOnly = false, limit = 20 } = {}) {
  const clean = String(repId || "").trim();
  if (!clean) return [];
  try {
    let query = supabase()
      .from("notifications")
      .select("*")
      .ilike("rep_id", clean)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(Math.min(100, Math.max(1, Number(limit) || 20)));
    if (unreadOnly) query = query.eq("is_read", false);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[data] notifications:", err.message);
    return [];
  }
}

// Best-effort: a failed notification insert must never fail the save that
// triggered it, so this logs and returns null instead of throwing.
export async function notifyRep(repId, type, title, body, payoutId = null) {
  const clean = String(repId || "").trim();
  if (!clean || !title) return null;
  try {
    const { data, error } = await supabase()
      .from("notifications")
      .insert({
        rep_id: clean,
        type: String(type || "info"),
        title: String(title),
        body: body ? String(body) : null,
        payout_id: payoutId || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data?.id ?? null;
  } catch (err) {
    console.error("[data] notifyRep:", err.message);
    return null;
  }
}

export async function getAll(table) {
  return fetchAll(table, { visibleOnly: false, order: true });
}
