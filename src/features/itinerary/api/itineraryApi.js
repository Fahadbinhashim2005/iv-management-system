import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import { processImageForUpload } from "../lib/imageUpload";

const MEDIA_BUCKET = "itinerary-media";

const STUDENT_STOP_COLUMNS =
  "id, itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc, title, location, category, description, image_path, image_alt, lat, lng, is_highlight, status_override, updated_by, updated_at";

const STAFF_STOP_COLUMNS = "*";

function assertSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
}

export function getThumbPathFromHero(heroPath) {
  if (!heroPath || typeof heroPath !== "string") return "";
  return heroPath.replace(/-1600\.webp$/, "-480.webp");
}

export function getMediaPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  if (!isSupabaseConfigured || !supabase) return "";
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

export function getMediaUrls(path) {
  if (!path) return { heroUrl: "", thumbUrl: "" };
  const heroUrl = getMediaPublicUrl(path);
  const thumbPath = getThumbPathFromHero(path);
  const thumbUrl = thumbPath ? getMediaPublicUrl(thumbPath) : heroUrl;
  return { heroUrl, thumbUrl };
}

function generateDatesRange(startIso, endIso) {
  const result = [];
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return result;
  }
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 60) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard++;
  }
  return result;
}

async function hydrateItinerary(itineraryRow, { staffView = false } = {}) {
  if (!itineraryRow) return null;
  const stopCols = staffView ? STAFF_STOP_COLUMNS : STUDENT_STOP_COLUMNS;

  const [{ data: days, error: dErr }, { data: stops, error: sErr }] = await Promise.all([
    supabase
      .from("itinerary_days")
      .select("*")
      .eq("itinerary_id", itineraryRow.id)
      .order("day_number", { ascending: true }),
    supabase
      .from("itinerary_stops")
      .select(stopCols)
      .eq("itinerary_id", itineraryRow.id)
      .order("sequence_no", { ascending: true }),
  ]);

  if (dErr) throw dErr;
  if (sErr) throw sErr;

  const stopsByDay = new Map();
  for (const st of stops || []) {
    const arr = stopsByDay.get(st.day_id) || [];
    arr.push(st);
    stopsByDay.set(st.day_id, arr);
  }

  return {
    ...itineraryRow,
    days: (days || []).map((d) => ({
      ...d,
      stops: (stopsByDay.get(d.id) || []).sort(
        (a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0)
      ),
    })),
  };
}

export const itineraryApi = {
  async listPublished() {
    assertSupabase();
    const { data, error } = await supabase
      .from("itineraries")
      .select("id, title, subtitle, start_date, end_date, status, is_active, updated_at")
      .eq("status", "published")
      .order("is_active", { ascending: false })
      .order("start_date", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listAll() {
    assertSupabase();
    const { data, error } = await supabase
      .from("itineraries")
      .select("*")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getActive({ staffView = false } = {}) {
    assertSupabase();
    const { data: activeRows, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("status", "published")
      .eq("is_active", true)
      .limit(1);
    if (error) throw error;

    let target = activeRows?.[0] || null;
    if (!target) {
      const { data: latestPublished, error: pubErr } = await supabase
        .from("itineraries")
        .select("*")
        .eq("status", "published")
        .order("start_date", { ascending: false })
        .limit(1);
      if (pubErr) throw pubErr;
      target = latestPublished?.[0] || null;
    }

    return hydrateItinerary(target, { staffView });
  },

  async get(id, { staffView = false } = {}) {
    assertSupabase();
    const { data, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return hydrateItinerary(data, { staffView });
  },

  async createItinerary({
    title,
    subtitle = "",
    start_date,
    end_date,
    cover_image_path = null,
    cover_alt = null,
  }) {
    assertSupabase();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    const { data: created, error } = await supabase
      .from("itineraries")
      .insert({
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        start_date,
        end_date,
        cover_image_path,
        cover_alt: cover_alt?.trim() || null,
        status: "draft",
        is_active: false,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) throw error;

    const dates = generateDatesRange(start_date, end_date);
    if (dates.length > 0) {
      const dayRows = dates.map((iso, idx) => ({
        itinerary_id: created.id,
        day_number: idx + 1,
        date: iso,
        title: `Day ${idx + 1}`,
      }));
      const { error: dayErr } = await supabase.from("itinerary_days").insert(dayRows);
      if (dayErr) throw dayErr;
    }

    return hydrateItinerary(created, { staffView: true });
  },

  async updateItinerary(id, updates, expectedUpdatedAt = null) {
    assertSupabase();
    let query = supabase.from("itineraries").update(updates).eq("id", id);
    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }
    const { data, error } = await query.select("*");
    if (error) throw error;
    if (!data || data.length === 0) {
      const err = new Error("Updated by someone else — reload?");
      err.code = "CONFLICT";
      throw err;
    }
    return data[0];
  },

  async deleteItinerary(id) {
    assertSupabase();
    const { error } = await supabase.from("itineraries").delete().eq("id", id);
    if (error) throw error;
  },

  async publishItinerary(id) {
    return this.updateItinerary(id, { status: "published" });
  },

  async unpublishItinerary(id) {
    return this.updateItinerary(id, { status: "draft" });
  },

  async archiveItinerary(id) {
    return this.updateItinerary(id, { status: "archived", is_active: false });
  },

  async setActive(id) {
    assertSupabase();
    const { error } = await supabase.rpc("set_active_itinerary", { target_id: id });
    if (error) throw error;
  },

  async duplicateItinerary(sourceId) {
    assertSupabase();
    const source = await this.get(sourceId, { staffView: true });
    if (!source) throw new Error("Source itinerary not found.");

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    const copyTitle = `${source.title} (Copy)`.slice(0, 120);
    const { data: newItin, error } = await supabase
      .from("itineraries")
      .insert({
        title: copyTitle,
        subtitle: source.subtitle,
        start_date: source.start_date,
        end_date: source.end_date,
        cover_image_path: source.cover_image_path,
        cover_alt: source.cover_alt,
        status: "draft",
        is_active: false,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw error;

    for (const day of source.days || []) {
      const { data: newDay, error: dErr } = await supabase
        .from("itinerary_days")
        .insert({
          itinerary_id: newItin.id,
          day_number: day.day_number,
          date: day.date,
          title: day.title,
          subtitle: day.subtitle,
          hero_image_path: day.hero_image_path,
          hero_alt: day.hero_alt,
          hero_blur: day.hero_blur,
          focal_x: day.focal_x,
          focal_y: day.focal_y,
        })
        .select("*")
        .single();
      if (dErr) throw dErr;

      if (day.stops?.length) {
        const stopInserts = day.stops.map((st) => ({
          itinerary_id: newItin.id,
          day_id: newDay.id,
          sequence_no: st.sequence_no,
          start_time: st.start_time,
          end_time: st.end_time,
          time_tbc: st.time_tbc,
          title: st.title,
          location: st.location,
          category: st.category,
          description: st.description,
          image_path: st.image_path,
          image_alt: st.image_alt,
          lat: st.lat,
          lng: st.lng,
          is_highlight: st.is_highlight,
          status_override: null,
          staff_note: st.staff_note,
          updated_by: userId,
        }));
        const { error: sErr } = await supabase.from("itinerary_stops").insert(stopInserts);
        if (sErr) throw sErr;
      }
    }

    return hydrateItinerary(newItin, { staffView: true });
  },

  async createDay(dayPayload) {
    assertSupabase();
    const { data, error } = await supabase
      .from("itinerary_days")
      .insert(dayPayload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async updateDay(id, updates, expectedUpdatedAt = null) {
    assertSupabase();
    let query = supabase.from("itinerary_days").update(updates).eq("id", id);
    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }
    const { data, error } = await query.select("*");
    if (error) throw error;
    if (!data || data.length === 0) {
      const err = new Error("Updated by someone else — reload?");
      err.code = "CONFLICT";
      throw err;
    }
    return data[0];
  },

  async deleteDay(id) {
    assertSupabase();
    const { error } = await supabase.from("itinerary_days").delete().eq("id", id);
    if (error) throw error;
  },

  async reorderDays(days) {
    assertSupabase();
    // Temporarily offset day_number to avoid unique constraint collisions
    for (let i = 0; i < days.length; i++) {
      const { error } = await supabase
        .from("itinerary_days")
        .update({ day_number: 1000 + i })
        .eq("id", days[i].id);
      if (error) throw error;
    }
    for (let i = 0; i < days.length; i++) {
      const { error } = await supabase
        .from("itinerary_days")
        .update({ day_number: i + 1 })
        .eq("id", days[i].id);
      if (error) throw error;
    }
  },

  async createStop(stopPayload) {
    assertSupabase();
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("itinerary_stops")
      .insert({ ...stopPayload, updated_by: authData?.user?.id || null })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async updateStop(id, updates, expectedUpdatedAt = null) {
    assertSupabase();
    const { data: authData } = await supabase.auth.getUser();
    let query = supabase
      .from("itinerary_stops")
      .update({ ...updates, updated_by: authData?.user?.id || null })
      .eq("id", id);
    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }
    const { data, error } = await query.select("*");
    if (error) throw error;
    if (!data || data.length === 0) {
      const err = new Error("Updated by someone else — reload?");
      err.code = "CONFLICT";
      throw err;
    }
    return data[0];
  },

  async deleteStop(id) {
    assertSupabase();
    const { error } = await supabase.from("itinerary_stops").delete().eq("id", id);
    if (error) throw error;
  },

  async reorderStops(orderedStopIds) {
    assertSupabase();
    for (let i = 0; i < orderedStopIds.length; i++) {
      const { error } = await supabase
        .from("itinerary_stops")
        .update({ sequence_no: i + 1 })
        .eq("id", orderedStopIds[i]);
      if (error) throw error;
    }
  },

  async setStopOverride(stopId, statusOverride) {
    assertSupabase();
    const { data, error } = await supabase
      .from("itinerary_stops")
      .update({ status_override: statusOverride || null })
      .eq("id", stopId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async shiftFrom(stopId, minutes) {
    assertSupabase();
    const { data, error } = await supabase.rpc("shift_itinerary_stops", {
      p_stop_id: stopId,
      p_delta_minutes: Number(minutes),
    });
    if (error) throw error;
    return data;
  },

  async listChanges(itineraryId, limit = 30) {
    assertSupabase();
    const { data, error } = await supabase
      .from("itinerary_changes")
      .select("*")
      .eq("itinerary_id", itineraryId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async uploadImage(file, { itineraryId, scope = "cover", existingPath = null, onProgress }) {
    assertSupabase();
    onProgress?.(15);
    const processed = await processImageForUpload(file);
    onProgress?.(45);

    const fileId = crypto.randomUUID();
    const base = `${itineraryId}/${scope}/${fileId}`;
    const heroPath = `${base}-1600.webp`;
    const thumbPath = `${base}-480.webp`;

    const [{ error: heroErr }, { error: thumbErr }] = await Promise.all([
      supabase.storage
        .from(MEDIA_BUCKET)
        .upload(heroPath, processed.heroBlob, { contentType: "image/webp", upsert: false }),
      supabase.storage
        .from(MEDIA_BUCKET)
        .upload(thumbPath, processed.thumbBlob, { contentType: "image/webp", upsert: false }),
    ]);

    if (heroErr) throw heroErr;
    if (thumbErr) throw thumbErr;
    onProgress?.(85);

    if (existingPath && !existingPath.startsWith("http")) {
      await this.removeImage(existingPath).catch(() => {});
    }
    onProgress?.(100);

    return {
      path: heroPath,
      thumbPath,
      blurDataUrl: processed.blurDataUrl,
      heroBytes: processed.heroBytes,
      thumbBytes: processed.thumbBytes,
    };
  },

  async removeImage(heroPath) {
    if (!heroPath || heroPath.startsWith("http")) return;
    assertSupabase();
    const thumbPath = getThumbPathFromHero(heroPath);
    const paths = [heroPath, thumbPath].filter(Boolean);
    if (paths.length === 0) return;
    await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  },
};
