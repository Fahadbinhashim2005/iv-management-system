import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { tripConfig } from "../config/tripConfig";

function getRoleTitle(row) {
  const role = String(row.role || "").toLowerCase();
  const coordType = String(row.coordinator_type || "faculty").toLowerCase();
  if (role === "admin") return "Chief Faculty Coordinator";
  if (coordType === "student") return "Student Coordinator";
  return "Faculty Coordinator";
}

function normalizePhoneHref(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

/**
 * Fetches registered Chief Faculty, Faculty, and Student Coordinators from Supabase
 * (via get_trip_helplines RPC with fallback to profiles query for staff) and merges
 * them with static tripConfig.helplines without duplicates.
 */
export async function loadTripHelplines() {
  const staticList = (tripConfig.helplines || []).map((h) => ({
    id: `cfg-${h.role}-${h.phone}`,
    role: h.role,
    person: h.person,
    phone: normalizePhoneHref(h.phone),
    display: h.display || h.phone,
    department: "",
    isDynamic: false,
  }));

  const dynamicList = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_trip_helplines");
      let rows = !rpcErr && Array.isArray(rpcData) ? rpcData : null;

      if (!rows) {
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, role, coordinator_type, department, phone")
          .in("role", ["admin", "coordinator"])
          .eq("approval_status", "approved")
          .order("full_name", { ascending: true });

        if (!profErr && Array.isArray(profData)) {
          rows = profData;
        }
      }

      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (!r?.full_name) continue;
          const cleanPhone = normalizePhoneHref(r.phone);
          dynamicList.push({
            id: r.id,
            role: getRoleTitle(r),
            person: r.department ? `${r.full_name} (${r.department})` : r.full_name,
            fullName: r.full_name,
            phone: cleanPhone,
            display: r.phone || "",
            department: r.department || "",
            rawRole: String(r.role || "").toLowerCase(),
            coordinatorType: String(r.coordinator_type || "faculty").toLowerCase(),
            isDynamic: true,
          });
        }
      }
    } catch {
      // Non-blocking fallback to static tripConfig.helplines
    }
  }

  // Merge without duplicates by normalized phone or person name
  const seen = new Set();
  const merged = [];
  for (const item of [...dynamicList, ...staticList]) {
    const key = item.phone || item.person.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}
