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
  const payload = {
    name: raw.name,
    slug: raw.slug || slugify(raw.name),
    description: raw.description || null,
    image_url: raw.image_url || null,
    video_url: raw.video_url || null,
    price: raw.price || null,
    category: raw.category || null,
    subcategory: raw.subcategory || null,
    product_type: raw.product_type || null,
    display_order: raw.display_order ? Number(raw.display_order) : 999,
    is_visible: raw.is_visible,
    in_stock: raw.in_stock,
    stock_label: raw.stock_label || null,
    occasion: raw.occasion || null,
    featured: raw.featured,
    material: raw.material || null,
    size: raw.size || null,
    turnaround: raw.turnaround || null,
    delivery_note: raw.delivery_note || null,
    payment_note: raw.payment_note || null,
    sales_caption: raw.sales_caption || null,
    icon: raw.icon || null,
  };

  try {
    let error;
    if (id) {
      ({ error } = await supabase()
        .from("products")
        .update(payload)
        .eq("id", id));
    } else {
      ({ error } = await supabase()
        .from("products")
        .insert(payload));
    }
    if (error) {
      if (error.code === "23505") {
        return internalError("A product with this slug already exists. Please choose a different slug or name.");
      }
      throw error;
    }
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[admin] saveProduct:", err.message);
    return internalError("Could not save the product.");
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
  const repDbId = Number(formData.get("id")) || null;
  const repId = (formData.get("rep_id") || "").toString().trim();
  if (!repId) return internalError("Rep code is required.");
  const resetPin = toBool(formData, "reset_pin");

  const rep = {
    rep_id: repId,
    name: (formData.get("name") || "").toString().trim() || null,
    commission_rate: (formData.get("commission_rate") || "").toString().trim()
      ? Number(formData.get("commission_rate"))
      : null,
    is_active: toBool(formData, "is_active"),
  };
  if (resetPin) {
    rep.pin_hash = null;
  }
  try {
    let error;
    let saved = null;
    if (repDbId) {
      ({ error } = await supabase()
        .from("sales_reps")
        .update(rep)
        .eq("id", repDbId));
      if (!error) saved = { id: repDbId, rep_id: repId, name: rep.name };
    } else {
      const { data, error: insertError } = await supabase()
        .from("sales_reps")
        .insert(rep)
        .select("id,rep_id,name")
        .single();
      error = insertError;
      if (!error) saved = data;
    }
    if (error) {
      if (error.code === "23505") {
        return internalError("A sales rep with this rep code already exists.");
      }
      throw error;
    }
    revalidatePath("/admin");
    // `rep` is returned so the form can show the invite/share panel for new reps.
    return { ok: true, rep: saved };
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
    return internalError("Could not save the testimonial.");
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

/* ── Shared helpers for simple content rows (Why us / Portfolio / How to order / FAQ) ── */

async function upsertRow(table, payload) {
  try {
    const { error } = await supabase().from(table).upsert(payload, { onConflict: "id" });
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error(`[admin] save ${table}:`, err.message);
    return internalError("Could not save.");
  }
}

async function deleteRow(table, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const id = Number(formData.get("id")) || null;
  if (!id) return internalError("Missing id.");
  try {
    const { error } = await supabase().from(table).delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error(`[admin] delete ${table}:`, err.message);
    return internalError("Could not delete.");
  }
}

export async function saveWhyUsAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const title = (formData.get("title") || "").toString().trim();
  const description = (formData.get("description") || "").toString().trim();
  if (!title) return internalError("Heading is required.");
  if (!description) return internalError("Description is required.");
  return upsertRow("why_us", {
    id: Number((formData.get("id") || "").toString().trim()) || undefined,
    title,
    heading: title,
    description,
    icon: (formData.get("icon") || "").toString().trim() || null,
    display_order: Number(formData.get("display_order")) || 999,
    is_visible: toBool(formData, "is_visible"),
  });
}

export async function deleteWhyUsAction(formData) {
  return deleteRow("why_us", formData);
}

export async function savePortfolioAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const imageUrl = (formData.get("image_url") || "").toString().trim();
  const caption = (formData.get("caption") || "").toString().trim();
  if (!imageUrl && !caption) return internalError("Add an image URL or a caption.");
  return upsertRow("portfolio", {
    id: Number((formData.get("id") || "").toString().trim()) || undefined,
    image_url: imageUrl || null,
    caption: caption || null,
    category: (formData.get("category") || "").toString().trim() || null,
    is_wide: toBool(formData, "is_wide"),
    display_order: Number(formData.get("display_order")) || 999,
    is_visible: toBool(formData, "is_visible"),
  });
}

export async function deletePortfolioAction(formData) {
  return deleteRow("portfolio", formData);
}

export async function saveHowToAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const title = (formData.get("title") || "").toString().trim();
  const description = (formData.get("description") || "").toString().trim();
  if (!title) return internalError("Step title is required.");
  if (!description) return internalError("Step description is required.");
  return upsertRow("how_to_order", {
    id: Number((formData.get("id") || "").toString().trim()) || undefined,
    title,
    description,
    display_order: Number(formData.get("display_order")) || 999,
    is_visible: toBool(formData, "is_visible"),
  });
}

export async function deleteHowToAction(formData) {
  return deleteRow("how_to_order", formData);
}

export async function saveFaqAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const question = (formData.get("question") || "").toString().trim();
  const answer = (formData.get("answer") || "").toString().trim();
  if (!question) return internalError("Question is required.");
  if (!answer) return internalError("Answer is required.");
  return upsertRow("faqs", {
    id: Number((formData.get("id") || "").toString().trim()) || undefined,
    question,
    answer,
    display_order: Number(formData.get("display_order")) || 999,
    is_visible: toBool(formData, "is_visible"),
  });
}

export async function deleteFaqAction(formData) {
  return deleteRow("faqs", formData);
}