import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { tripConfig } from "../config/tripConfig";

function formatDisplayDate(isoDate) {
  if (!isoDate) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate));
  if (!match) return String(isoDate);
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getConfigFallback() {
  return (tripConfig.defaultItineraryDays || []).map((d, idx) => ({
    id: null,
    dayNumber: idx,
    day: d.day,
    date: d.date,
    isoDate: d.isoDate || "",
    title: d.title,
    events: (d.events || []).map((ev) => ({ ...ev })),
  }));
}

async function resolveActiveVisitId() {
  const { data: visits } = await supabase
    .from("industrial_visits")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  return visits?.[0]?.id || null;
}

/**
 * Loads the shared itinerary from Supabase (visit_days + itinerary_items).
 * Falls back to read-only tripConfig.defaultItineraryDays if DB tables are empty
 * or not yet applied.
 */
export async function loadSharedItinerary() {
  const fallbackDays = getConfigFallback();
  if (!isSupabaseConfigured || !supabase) {
    return { days: fallbackDays, source: "config", visitId: null };
  }

  try {
    const visitId = await resolveActiveVisitId();
    if (!visitId) {
      return { days: fallbackDays, source: "config", visitId: null };
    }

    const { data: dayRows, error: dayErr } = await supabase
      .from("visit_days")
      .select("id, day_number, date, title")
      .eq("visit_id", visitId)
      .order("day_number", { ascending: true });

    if (dayErr || !Array.isArray(dayRows) || dayRows.length === 0) {
      return { days: fallbackDays, source: "config", visitId };
    }

    const dayIds = dayRows.map((d) => d.id);
    const { data: itemRows, error: itemErr } = await supabase
      .from("itinerary_items")
      .select("id, day_id, sequence_no, scheduled_time, activity_title, venue, activity_type, officer_in_charge, notes")
      .in("day_id", dayIds)
      .order("sequence_no", { ascending: true });

    if (itemErr) {
      return { days: fallbackDays, source: "config", visitId };
    }

    const itemsByDay = new Map();
    for (const item of itemRows || []) {
      const list = itemsByDay.get(item.day_id) || [];
      list.push({
        id: item.id,
        time: item.scheduled_time,
        activity: item.activity_title,
        location: item.venue,
        category: item.activity_type || "Industry",
        inCharge: item.officer_in_charge || "",
        details: item.notes || "",
      });
      itemsByDay.set(item.day_id, list);
    }

    const days = dayRows.map((d) => ({
      id: d.id,
      dayNumber: d.day_number,
      day: `Day ${d.day_number}`,
      date: formatDisplayDate(d.date),
      isoDate: d.date,
      title: d.title,
      events: itemsByDay.get(d.id) || [],
    }));

    return { days, source: "supabase", visitId };
  } catch {
    return { days: fallbackDays, source: "config", visitId: null };
  }
}

/**
 * Seeds visit_days + itinerary_items from tripConfig on first coordinator edit
 * if visit_days is not yet populated in Supabase.
 */
async function ensureVisitDaysInSupabase(visitId, currentDays) {
  const { data: existing } = await supabase
    .from("visit_days")
    .select("id, day_number")
    .eq("visit_id", visitId);

  if (Array.isArray(existing) && existing.length > 0) {
    return new Map(existing.map((r) => [r.day_number, r.id]));
  }

  const dayInserts = currentDays.map((d, idx) => ({
    visit_id: visitId,
    day_number: d.dayNumber ?? idx,
    date: d.isoDate || tripConfig.trip.startDate,
    title: d.title,
  }));

  const { data: insertedDays, error: insDayErr } = await supabase
    .from("visit_days")
    .insert(dayInserts)
    .select("id, day_number");

  if (insDayErr) throw insDayErr;

  const dayMap = new Map(insertedDays.map((r) => [r.day_number, r.id]));

  const itemInserts = [];
  for (let idx = 0; idx < currentDays.length; idx++) {
    const d = currentDays[idx];
    const dayId = dayMap.get(d.dayNumber ?? idx);
    if (!dayId) continue;
    (d.events || []).forEach((ev, seq) => {
      itemInserts.push({
        day_id: dayId,
        sequence_no: seq + 1,
        scheduled_time: ev.time || "",
        activity_title: ev.activity || "",
        venue: ev.location || "",
        activity_type: ev.category || "Industry",
        officer_in_charge: ev.inCharge || "",
        notes: ev.details || "",
      });
    });
  }

  if (itemInserts.length > 0) {
    const { error: insItemErr } = await supabase
      .from("itinerary_items")
      .insert(itemInserts);
    if (insItemErr) throw insItemErr;
  }

  return dayMap;
}

export async function addSharedItineraryEvent({ visitId, dayIndex, currentDays, newEvent }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Itinerary edits require a live database.");
  }

  const resolvedVisitId = visitId || (await resolveActiveVisitId());
  if (!resolvedVisitId) {
    throw new Error("No active industrial visit found in database.");
  }

  const targetDay = currentDays[dayIndex];
  if (!targetDay) throw new Error("Selected itinerary day not found.");

  let dayId = targetDay.id;
  if (!dayId) {
    const dayMap = await ensureVisitDaysInSupabase(resolvedVisitId, currentDays);
    dayId = dayMap.get(targetDay.dayNumber ?? dayIndex);
  }
  if (!dayId) throw new Error("Could not resolve itinerary day in database.");

  const nextSeq = (targetDay.events?.length || 0) + 1;
  const { data, error } = await supabase
    .from("itinerary_items")
    .insert({
      day_id: dayId,
      sequence_no: nextSeq,
      scheduled_time: newEvent.time.trim(),
      activity_title: newEvent.activity.trim(),
      venue: newEvent.location.trim(),
      activity_type: newEvent.category || "Industry",
      officer_in_charge: newEvent.inCharge?.trim() || "",
      notes: newEvent.details?.trim() || "",
    })
    .select("id, scheduled_time, activity_title, venue, activity_type, officer_in_charge, notes")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    time: data.scheduled_time,
    activity: data.activity_title,
    location: data.venue,
    category: data.activity_type,
    inCharge: data.officer_in_charge || "",
    details: data.notes || "",
  };
}

export async function deleteSharedItineraryEvent(eventId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Itinerary edits require a live database.");
  }
  const { error } = await supabase.from("itinerary_items").delete().eq("id", eventId);
  if (error) throw error;
}
