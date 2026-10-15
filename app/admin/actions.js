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
import { slugify, directImageUrl, validateUrl, videoUrl, isSupabaseImage, isDriveUrl } from "@/lib/format";

function internalError(message) {
  return { ok: false, error: message };
}

/* ── Image storage (Supabase Storage "images" bucket) ───────────────────────────────────────────── */

const IMAGE_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function extFromType(type) {
  return IMAGE_EXT[String(type || "").toLowerCase()] || null;
}

function safeFolder(value) {
  const clean = String(value || "products").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return clean || "products";
}

const STORAGE_MARKER = "/storage/v1/object/public/images/";

// Upload one image file (from the admin ImageField) and return its public URL.
export async function uploadImageAction(formData) {
  if (!(await requireAdmin())) return { error: "Session expired. Log in again." };
  const file = formData.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return { error: "No image selected." };
  }
  if (!String(file.type || "").startsWith("image/")) {
    return { error: "Please choose an image file (jpg, png, webp…)." };
  }
  if (file.size > 6 * 1024 * 1024) {
    return { error: "Image is too large — please use one under 6 MB." };
  }
  const ext = extFromType(file.type) || "jpg";
  const path = `${safeFolder(formData.get("folder"))}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    const buffer = await file.arrayBuffer();
    const { error } = await supabase()
      .storage.from("images")
      .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: false, cacheControl: "31536000" });
    if (error) throw error;
    const { data } = supabase().storage.from("images").getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (err) {
    console.error("[admin] uploadImage:", err.message);
    return {
      error:
        "Upload failed. Make sure the public 'images' bucket exists (run supabase/migrations/0005_image_storage.sql).",
    };
  }
}

// Best-effort removal of an image we own from the bucket (used on row delete).
async function removeStorageImage(imageUrl) {
  const url = String(imageUrl || "");
  const idx = url.indexOf(STORAGE_MARKER);
  if (idx === -1) return;
  const path = url.slice(idx + STORAGE_MARKER.length).split("?")[0];
  try {
    await supabase().storage.from("images").remove([path]);
  } catch (err) {
    console.error("[admin] removeImage:", err.message);
  }
}

function needsMigration(url) {
  const raw = String(url || "").trim();
  if (!raw) return false;
  const direct = directImageUrl(raw);
  if (!validateUrl(direct)) return false;
  if (isSupabaseImage(direct)) return false;
  // Skip video links that happen to live in image_url.
  const looksLikeImage = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(direct) || isDriveUrl(raw) || !videoUrl(direct);
  return looksLikeImage;
}

// Copy existing remote/Drive images into the bucket and repoint the rows at the
// new public URLs. Runs in small batches (serverless time limits); the client
// calls it repeatedly until nothing is left.
export async function migrateImagesAction(prevState, formData) {
  if (!(await requireAdmin())) return internalError("Session expired. Log in again.");
  const limit = Math.min(12, Math.max(1, Number(formData.get("limit")) || 6));

  try {
    const [{ data: prodRows }, { data: portRows }, { data: settingRows }] = await Promise.all([
      supabase().from("products").select("id,image_url"),
      supabase().from("portfolio").select("id,image_url"),
      supabase().from("site_settings").select("key,value"),
    ]);

    const targets = [];
    (prodRows || []).forEach((p) => {
      if (needsMigration(p.image_url)) targets.push({ table: "products", id: p.id, url: p.image_url });
    });
    (portRows || []).forEach((p) => {
      if (needsMigration(p.image_url)) targets.push({ table: "portfolio", id: p.id, url: p.image_url });
    });
    (settingRows || []).forEach((s) => {
      if (/image_url$/i.test(s.key) && needsMigration(s.value)) {
        targets.push({ table: "site_settings", id: s.key, url: s.value });
      }
    });

    const total = targets.length;
    const batch = targets.slice(0, limit);
    let migrated = 0;
    const errors = [];

    for (const t of batch) {
      try {
        const direct = directImageUrl(t.url);
        const res = await fetch(direct, { redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = res.headers.get("content-type") || "image/jpeg";
        if (!type.startsWith("image/")) throw new Error(`not an image (${type})`);
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 8 * 1024 * 1024) throw new Error("larger than 8 MB");

        const ext = extFromType(type) || "jpg";
        const base = `migrated/${t.table}-${t.id}`.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
        const path = `${base}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase()
          .storage.from("images")
          .upload(path, buffer, { contentType: type, upsert: true, cacheControl: "31536000" });
        if (upErr) throw upErr;

        const { data } = supabase().storage.from("images").getPublicUrl(path);
        const publicUrl = data.publicUrl;
        const { error: updErr } =
          t.table === "site_settings"
            ? await supabase().from("site_settings").update({ value: publicUrl }).eq("key", t.id)
            : await supabase().from(t.table).update({ image_url: publicUrl }).eq("id", t.id);
        if (updErr) throw updErr;
        migrated++;
      } catch (err) {
        errors.push(`${t.table} #${t.id}: ${err.message}`);
      }
    }

    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return {
      ok: true,
      migrated,
      remaining: Math.max(0, total - migrated),
      total,
      errors: errors.slice(0, 6),
    };
  } catch (err) {
    console.error("[admin] migrateImages:", err.message);
    return internalError("Could not migrate images.");
  }
}

// Health check used by the admin Settings panel so a missing bucket or a
// missing service-role key shows an explicit message instead of a silent
// upload failure.
export async function checkImageStorageAction() {
  if (!(await requireAdmin())) return { ok: false, error: "Session expired. Log in again." };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      error:
        "Supabase is not configured on the server. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.",
    };
  }

  try {
    const { data, error } = await supabase().storage.getBucket("images");
    if (error || !data) {
      return {
        ok: false,
        error:
          "The 'images' storage bucket was not found. Run supabase/migrations/0005_image_storage.sql in your Supabase project.",
      };
    }
    return { ok: true, public: data.public === true };
  } catch (err) {
    console.error("[admin] checkImageStorage:", err.message);
    return {
      ok: false,
      error: "Could not reach Supabase Storage. Check the Supabase URL and service-role key, then try again.",
    };
  }
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

  // Duplicate guard (create only): the same product name in the same category
  // is very likely the same gift saved twice (slugs are unique, so the DB lets
  // it through). Block the insert and let the form offer an explicit
  // "Save anyway" (force=true) override.
  if (!id && formData.get("force") !== "true") {
    try {
      const key = `${slugify(raw.name)}::${slugify(raw.category)}`;
      const { data: allProducts } = await supabase()
        .from("products")
        .select("id, name, category, image_url");
      const existing = (allProducts || []).filter(
        (p) => `${slugify(p.name || "")}::${slugify(p.category || "")}` === key
      );
      if (existing.length > 0) {
        return {
          ok: false,
          duplicate: true,
          error: `A product named "${raw.name}" already exists${
            raw.category ? ` in "${raw.category}"` : ""
          }. Save anyway if it is a different piece.`,
          existing: existing.slice(0, 4),
        };
      }
    } catch (err) {
      // Duplicate guard is best-effort — never block a save because of it.
      console.error("[admin] duplicateScan:", err.message);
    }
  }

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
    if (id > 0) {
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
  const id = Number(formData.get("id")) || 0;
  if (!id) return internalError("Missing product id.");
  try {
    const { data: row } = await supabase().from("products").select("image_url").eq("id", id).maybeSingle();
    const { error } = await supabase().from("products").delete().eq("id", id);
    if (error) throw error;
    if (row?.image_url) await removeStorageImage(row.image_url);
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
  const repDbId = Number(formData.get("id")) || 0;
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
    if (repDbId > 0) {
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
  const id = Number(formData.get("id")) || 0;
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

  const testimonialId = Number(raw.id) || 0;
  const testimonialFields = {
    name: raw.name,
    quote: raw.quote,
    source: raw.source || null,
    rating: raw.rating ? Number(raw.rating) : null,
    display_order: raw.display_order ? Number(raw.display_order) : 999,
    is_visible: raw.is_visible,
  };

  // `id` is a generated-always identity column, so edit via update and create via
  // insert (an upsert with an explicit id would be rejected by Postgres).
  try {
    const query = testimonialId > 0
      ? supabase().from("testimonials").update(testimonialFields).eq("id", testimonialId)
      : supabase().from("testimonials").insert(testimonialFields);
    const { error } = await query;
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
  const id = Number(formData.get("id")) || 0;
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
  // These tables use `id bigint generated always as identity`, so an upsert that
  // carries an explicit id is rejected by Postgres ("cannot insert a non-DEFAULT
  // value into column id"). Update by id when editing, insert when creating.
  const { id, ...rest } = payload || {};
  const rowId = Number(id) || 0;
  const fields = { ...rest };
  if ("id" in fields) delete fields.id;
  try {
    const query = rowId > 0
      ? supabase().from(table).update(fields).eq("id", rowId)
      : supabase().from(table).insert(fields);
    const { error } = await query;
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
  const id = Number(formData.get("id")) || 0;
  if (!id) return internalError("Missing id.");
  try {
    // Only portfolio rows carry a migrated image; fetch it first so we can tidy
    // up the bucket after the row is gone.
    const { data: row } =
      table === "portfolio"
        ? await supabase().from(table).select("image_url").eq("id", id).maybeSingle()
        : { data: null };
    const { error } = await supabase().from(table).delete().eq("id", id);
    if (error) throw error;
    if (row?.image_url) await removeStorageImage(row.image_url);
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
    id: (formData.get("id") || "").toString().trim(),
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

  const icon = (formData.get("icon") || "").toString().trim() || null;
  const payload = {
    id: (formData.get("id") || "").toString().trim(),
    image_url: imageUrl || null,
    caption: caption || null,
    category: (formData.get("category") || "").toString().trim() || null,
    is_wide: toBool(formData, "is_wide"),
    display_order: Number(formData.get("display_order")) || 999,
    is_visible: toBool(formData, "is_visible"),
  };

  // The optional icon column is added by supabase/migrations/0004_portfolio_icon.sql.
  // Detect it so the form keeps working (without an icon) until the migration is run.
  let iconSupported = true;
  try {
    const probe = await supabase().from("portfolio").select("icon").limit(1);
    iconSupported = !probe.error;
  } catch {
    iconSupported = false;
  }
  if (!iconSupported) {
    if (icon) {
      return internalError(
        "The portfolio icon needs a one-time database update. Run supabase/migrations/0004_portfolio_icon.sql in the Supabase SQL editor, then save again."
      );
    }
    return upsertRow("portfolio", payload);
  }

  payload.icon = icon;
  return upsertRow("portfolio", payload);
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
    id: (formData.get("id") || "").toString().trim(),
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
    id: (formData.get("id") || "").toString().trim(),
    question,
    answer,
    display_order: Number(formData.get("display_order")) || 999,
    is_visible: toBool(formData, "is_visible"),
  });
}

export async function deleteFaqAction(formData) {
  return deleteRow("faqs", formData);
}