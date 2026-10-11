"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import {
  SESSION_COOKIE,
  verifyPassword,
  createSessionCookieValue,
  verifySessionCookieValue,
} from "@/lib/auth";
import { slugify } from "@/lib/format";

function internalError(message) {
  return { ok: false, error: message };
}

function toBool(formData, key) {
  const v = String(formData.get(key) ?? "").trim();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifySessionCookieValue(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function loginAction(prevState, formData) {
  const password = String(formData.get("password") || "");
  if (!(await verifyPassword(password))) {
    return { error: "Incorrect password. Try again." };
  }
  const token = await createSessionCookieValue();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  revalidatePath("/admin");
  return { ok: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  revalidatePath("/admin");
}

export async function saveProductAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const raw = {
    id: (formData.get("id") || "").toString().trim(),
    name: (formData.get("name") || "").toString().trim(),
    slug: (formData.get("slug") || "").toString().trim(),
    description: (formData.get("description") || "").toString().trim(),
    image_url: (formData.get("image_url") || "").toString().trim(),
    video_url: (formData.get("video_url") || "").toString().trim(),
    price: (formData.get("price") || "").toString().trim(),
    category: (formData.get("category") || "").toString().trim(),
    subcategory: (formData.get("subcategory") || "").toString().trim(),
    product_type: (formData.get("product_type") || "").toString().trim(),
    display_order: (formData.get("display_order") || "").toString().trim(),
    is_visible: toBool(formData, "is_visible"),
    in_stock: toBool(formData, "in_stock"),
    stock_label: (formData.get("stock_label") || "").toString().trim(),
    occasion: (formData.get("occasion") || "").toString().trim(),
    featured: toBool(formData, "featured"),
    material: (formData.get("material") || "").toString().trim(),
    size: (formData.get("size") || "").toString().trim(),
    turnaround: (formData.get("turnaround") || "").toString().trim(),
    delivery_note: (formData.get("delivery_note") || "").toString().trim(),
    payment_note: (formData.get("payment_note") || "").toString().trim(),
    sales_caption: (formData.get("sales_caption") || "").toString().trim(),
    icon: (formData.get("icon") || "").toString().trim(),
  };

  if (!raw.name) return internalError("Product name is required.");
  const id = Number(raw.id) || null;
  const product = {
    ...raw,
    id: undefined,
    slug: raw.slug || slugify(raw.name),
    display_order: raw.display_order ? Number(raw.display_order) : 999,
  };

  try {
    const { error } = await supabase()
      .from("products")
      .upsert(product, { onConflict: "slug" });
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[admin] saveProduct:", err.message);
    return internalError("Could not save the product. " + err.message);
  }
}

export async function deleteProductAction(formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const id = Number(formData.get("id")) || null;
  if (!id) return internalError("Missing product id.");
  try {
    const { error } = await supabase().from("products").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[admin] deleteProduct:", err.message);
    return internalError("Could not delete the product.");
  }
}

export async function saveSettingAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const key = (formData.get("key") || "").toString().trim();
  const value = (formData.get("value") || "").toString();
  if (!key) return internalError("Setting key is required.");
  try {
    const { error } = await supabase().from("site_settings").upsert(
      { key, value },
      { onConflict: "key" }
    );
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[admin] saveSetting:", err.message);
    return internalError("Could not save the setting.");
  }
}

export async function saveSettingsAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const entries = [];
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    const clean = value.trim();
    if (!clean) continue;
    entries.push({ key, value: clean });
  }
  if (entries.length === 0) {
    return internalError("Nothing to save — fill in at least one field.");
  }
  try {
    const { error } = await supabase()
      .from("site_settings")
      .upsert(entries, { onConflict: "key" });
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[admin] saveSettings:", err.message);
    return internalError("Could not save the settings.");
  }
}

export async function deleteSettingAction(formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const key = (formData.get("key") || "").toString().trim();
  if (!key) return internalError("Missing setting key.");
  try {
    const { error } = await supabase().from("site_settings").delete().eq("key", key);
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[admin] deleteSetting:", err.message);
    return internalError("Could not delete the setting.");
  }
}

export async function saveRepAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const repId = (formData.get("rep_id") || "").toString().trim();
  if (!repId) return internalError("Rep code is required.");
  const rep = {
    rep_id: repId,
    name: (formData.get("name") || "").toString().trim() || null,
    commission_rate: (formData.get("commission_rate") || "").toString().trim()
      ? Number(formData.get("commission_rate"))
      : null,
    is_active: toBool(formData, "is_active"),
  };
  try {
    const { error } = await supabase()
      .from("sales_reps")
      .upsert(rep, { onConflict: "rep_id" });
    if (error) throw error;
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("[admin] saveRep:", err.message);
    return internalError("Could not save the rep.");
  }
}

export async function deleteRepAction(formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const id = Number(formData.get("id")) || null;
  if (!id) return internalError("Missing rep id.");
  try {
    const { error } = await supabase().from("sales_reps").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("[admin] deleteRep:", err.message);
    return internalError("Could not delete the rep.");
  }
}

export async function saveTestimonialAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const raw = {
    id: (formData.get("id") || "").toString().trim(),
    name: (formData.get("name") || "").toString().trim(),
    quote: (formData.get("quote") || "").toString().trim(),
    source: (formData.get("source") || "").toString().trim(),
    rating: (formData.get("rating") || "").toString().trim(),
    display_order: (formData.get("display_order") || "").toString().trim(),
    is_visible: toBool(formData, "is_visible"),
  };

  if (!raw.name) return internalError("Name is required.");
  if (!raw.quote) return internalError("Testimonial message is required.");

  const testimonial = {
    id: Number(raw.id) || undefined,
    name: raw.name,
    quote: raw.quote,
    source: raw.source || null,
    rating: raw.rating ? Number(raw.rating) : null,
    display_order: raw.display_order ? Number(raw.display_order) : 999,
    is_visible: raw.is_visible,
  };

  try {
    const { error } = await supabase()
      .from("testimonials")
      .upsert(testimonial, { onConflict: "id" });
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[admin] saveTestimonial:", err.message);
    return internalError("Could not save the testimonial. " + err.message);
  }
}

export async function deleteTestimonialAction(formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const id = Number(formData.get("id")) || null;
  if (!id) return internalError("Missing testimonial id.");
  try {
    const { error } = await supabase().from("testimonials").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[admin] deleteTestimonial:", err.message);
    return internalError("Could not delete the testimonial.");
  }
}