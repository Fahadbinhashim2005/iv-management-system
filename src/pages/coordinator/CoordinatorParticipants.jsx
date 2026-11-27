import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";
import { downloadCsvFile } from "../../lib/exportUtils";
import Avatar from "../../components/Avatar";
import {
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Phone,
  Bus,
  BedDouble,
  Ban,
  AlertCircle,
  Users,
  FileCheck2,
  Loader2,
} from "lucide-react";

export default function CoordinatorParticipants() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  const loadStudents = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const res = await api.getApprovedStudents();
      setStudents(Array.isArray(res?.students) ? res.students : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load approved students.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStudents(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadStudents]);

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast("No students in current view to export.", { icon: "ℹ️" });
      return;
    }
    downloadCsvFile(
      `IV2026_Approved_Students_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Name",
        "Roll No",
        "Email",
        "Department",
        "Batch",
        "Gender",
        "Account Status",
        "Room",
        "Stay",
        "Bus",
        "Seat",
        "Phone",
        "Emergency Phone",
        "Blood Group",
        "Consent",
      ],
      filtered.map((s) => [
        s.full_name || "Student",
        s.roll_no || "",
        s.email || "",
        s.department || "",
        s.batch || "",
        s.gender || "Unset",
        s.is_active === false ? "Deactivated" : "Approved",
        s.room_no || "Unallocated",
        s.hotel_name || "",
        s.bus_no || "Unassigned",
        s.seat_no || "",
        s.phone || "",
        s.emergency_phone || "",
        s.blood_group || "",
        s.consent_given ? "Verified" : "Pending",
      ])
    );
    toast.success(`Exported ${filtered.length} approved student(s) to CSV.`);
  };

  const hasRoom = (s) => Boolean(s.room_no || (s.room_assignments && s.room_assignments.length > 0));
  const needsReadiness = (s) => !s.consent_given || !s.emergency_phone || !s.blood_group || !s.gender;

  const counts = {
    all: students.length,
    roomed: students.filter(hasRoom).length,
    unallocated: students.filter((s) => !hasRoom(s)).length,
    consented: students.filter((s) => Boolean(s.consent_given)).length,
    needsReadiness: students.filter(needsReadiness).length,
  };

  const filtered = students.filter((s) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (s.full_name || "").toLowerCase().includes(q) ||
      (s.roll_no || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.department || "").toLowerCase().includes(q) ||
      (s.room_no || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (genderFilter === "unset" && s.gender) return false;
    if (genderFilter !== "all" && genderFilter !== "unset" && (s.gender || "").toLowerCase() !== genderFilter) {
      return false;
    }

    if (filterMode === "roomed") return hasRoom(s);
    if (filterMode === "unallocated") return !hasRoom(s);
    if (filterMode === "consented") return Boolean(s.consent_given);
    if (filterMode === "needsReadiness") return needsReadiness(s);
    return true;
  });

  const activeCount = students.filter((s) => s.is_active !== false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Approved Directory</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Students
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Live roster of Admin-approved students synced with room allocations, medical readiness, and emergency contacts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadStudents(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 shadow-xs transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-emerald-700" : "text-emerald-700"} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-xs transition hover:bg-emerald-100 active:scale-95"
          >
            <Download size={15} className="text-emerald-800" />
            <span>Export Students (CSV)</span>
          </button>
        </div>
      </div>

      {/* Admin-Only Approval Scope Notice */}
      <div className="flex items-start sm:items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-xs text-emerald-900">
        <ShieldCheck size={18} className="mt-0.5 sm:mt-0 shrink-0 text-emerald-700" />
        <p>
          Showing <strong>Admin-approved students only</strong>. Student access requests, approvals, and account provisioning are managed exclusively by the Administrator.
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved Students</span>
            <Users size={16} className="text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{counts.all}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{activeCount} active accounts</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rooms Assigned</span>
            <BedDouble size={16} className="text-purple-700" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{counts.roomed}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{counts.unallocated} unallocated</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Consent Verified</span>
            <FileCheck2 size={16} className="text-blue-700" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{counts.consented}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">of {counts.all} students</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Profile Follow-up</span>
            <AlertCircle size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{counts.needsReadiness}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Missing consent/medical/gender</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, roll no, email, department, or room..."
              aria-label="Search approved students"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-2xs"
            />
          </div>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            aria-label="Filter students by gender"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 focus:border-emerald-600 focus:outline-none"
          >
            <option value="all">All Genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="unset">Gender Unset</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All", count: counts.all },
            { id: "roomed", label: "Room Assigned", count: counts.roomed },
            { id: "unallocated", label: "No Room", count: counts.unallocated },
            { id: "consented", label: "Consented", count: counts.consented },
            { id: "needsReadiness", label: "Incomplete Profile", count: counts.needsReadiness },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={filterMode === tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shrink-0 ${
                filterMode === tab.id
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Empty States */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-12 text-xs font-semibold text-gray-500 shadow-xs ring-1 ring-gray-100">
          <Loader2 size={18} className="animate-spin text-emerald-700" />
          <span>Syncing approved students...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-xs ring-1 ring-gray-100 space-y-2">
          <Users size={34} className="mx-auto text-emerald-600 opacity-60" />
          <h3 className="text-base font-bold text-gray-900">No Approved Students Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {students.length === 0
              ? "Once the Administrator approves student accounts, they will appear here automatically."
              : "No approved students match your current search or filter criteria."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (Screens < 768px) */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((s) => {
              const roomLabel = s.room_no ? `Room ${s.room_no}` : "Unallocated";
              const contactPhone = s.emergency_phone || s.phone;
              const isActive = s.is_active !== false;

              return (
                <div key={s.id} className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar profile={s} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-sm text-emerald-950">{s.full_name || "Student"}</p>
                        <p className="truncate font-mono text-[11px] text-gray-500">
                          {s.roll_no || "No Roll No"} • {s.batch || s.department || "CSE"}
                        </p>
                        <p className="truncate text-[11px] text-gray-400">{s.email}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                        isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isActive ? <CheckCircle2 size={11} /> : <Ban size={11} />}
                      {isActive ? "Approved" : "Inactive"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-700 min-w-0">
                      <BedDouble size={13} className="shrink-0 text-emerald-700" />
                      <span className="truncate">{roomLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700 min-w-0">
                      <Bus size={13} className="shrink-0 text-emerald-700" />
                      <span className="truncate">
                        {s.bus_no ? `${s.bus_no}${s.seat_no ? ` (${s.seat_no})` : ""}` : "Bus Pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 col-span-2 min-w-0">
                      <Phone size={13} className="shrink-0 text-gray-400" />
                      {contactPhone ? (
                        <a href={`tel:${contactPhone.replace(/\s+/g, "")}`} className="font-semibold text-emerald-800 hover:underline truncate">
                          {contactPhone}
                        </a>
                      ) : (
                        <span className="text-amber-700">No emergency phone</span>
                      )}
                      <span className="text-gray-300">•</span>
                      <span>
                        Blood: <strong className="text-red-700">{s.blood_group || "--"}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold capitalize ${
                        s.gender ? "bg-blue-50 text-blue-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      Gender: {s.gender || "Unset"}
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 font-bold ${
                        s.consent_given ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {s.consent_given ? "Consent Verified ✓" : "Consent Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table (Screens >= 768px) */}
          <div className="hidden md:block overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-5 py-3.5">Gender &amp; Account</th>
                    <th className="px-5 py-3.5">Allocated Room</th>
                    <th className="px-5 py-3.5">Transport</th>
                    <th className="px-5 py-3.5">Emergency Contact &amp; Medical</th>
                    <th className="px-5 py-3.5 text-right">Readiness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => {
                    const isActive = s.is_active !== false;
                    const contactPhone = s.emergency_phone || s.phone;

                    return (
                      <tr key={s.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar profile={s} size="sm" />
                            <div>
                              <p className="font-bold text-emerald-950 text-sm">{s.full_name || "Student"}</p>
                              <p className="font-mono text-[11px] text-gray-500">
                                {s.roll_no || "No Roll"} • {s.batch || s.department || "CSE"}
                              </p>
                              <p className="text-[11px] text-gray-400">{s.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 space-y-1">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {isActive ? <CheckCircle2 size={11} /> : <Ban size={11} />}
                              {isActive ? "Approved" : "Deactivated"}
                            </span>
                          </div>
                          <div>
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                                s.gender ? "bg-blue-50 text-blue-800" : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {s.gender || "Gender unset"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {s.room_no ? (
                            <>
                              <p className="font-bold text-emerald-950">Room #{s.room_no}</p>
                              <p className="text-[11px] text-gray-500">{s.hotel_name || "Stay Assigned"}</p>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-amber-700">Unallocated</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-emerald-950">{s.bus_no || "Pending"}</p>
                          <p className="text-[11px] text-gray-500">
                            {s.seat_no ? `Seat: ${s.seat_no}` : "Seat unassigned"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {contactPhone ? (
                            <a
                              href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                              className="font-semibold text-emerald-800 hover:underline"
                            >
                              {contactPhone}
                            </a>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-700">No emergency phone</span>
                          )}
                          <p className="text-[11px] text-red-600 font-bold">
                            Blood Group: {s.blood_group || "--"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              s.consent_given
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {s.consent_given ? "Consent Verified" : "Consent Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
