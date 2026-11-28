import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { downloadCsvFile } from "../../lib/exportUtils";
import { api } from "../../services/api";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { attendanceApi } from "../../features/attendance/api/attendanceApi";
import { tripConfig } from "../../config/tripConfig";
import {
  Bus,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Search,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";

export default function CoordinatorTransport() {
  const [selectedBusId, setSelectedBusId] = useState("");
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manifestSearch, setManifestSearch] = useState("");
  const [boardingSession, setBoardingSession] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const loadTransportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Load approved students + trip_assignments
      const studentsRes = await api.getApprovedStudents();
      const approved = Array.isArray(studentsRes?.students)
        ? studentsRes.students.filter(
          (p) => String(p.role || "student").toLowerCase() === "student"
        )
        : [];

      let assignments = [];
      if (isSupabaseConfigured && supabase) {
        const { data: taRows, error: taErr } = await supabase
          .from("trip_assignments")
          .select("user_id, bus_no, seat_no");
        if (taErr) throw taErr;
        assignments = Array.isArray(taRows) ? taRows : [];
      }

      // 2. Optionally check latest active boarding/departure attendance session for persistent boarded state
      let activeSession = null;
      const presentStudentIds = new Set();
      try {
        const sessions = await attendanceApi.listSessions({ status: "active" });
        const list = Array.isArray(sessions) ? sessions : [];
        activeSession =
          list.find((s) => s.purpose === "boarding") ||
          list.find((s) => s.purpose === "departure") ||
          list[0] ||
          null;
        if (activeSession?.id) {
          const roster = await attendanceApi.getRoster(activeSession.id, {
            status: "present",
          });
          const presentRows = roster?.students || roster?.rows || [];
          presentRows.forEach((row) => {
            if (row?.id) presentStudentIds.add(row.id);
            if (row?.student_id) presentStudentIds.add(row.student_id);
          });
        }
      } catch {
        // Attendance service optional here; manifest still renders cleanly
      }
      setBoardingSession(activeSession);

      // 3. Join students with trip_assignments by user_id
      const studentMap = new Map(approved.map((s) => [s.id, s]));
      const manifestByBus = new Map();

      for (const row of assignments) {
        if (!row.bus_no) continue;
        const student = studentMap.get(row.user_id);
        if (!student) continue;
        const list = manifestByBus.get(row.bus_no) || [];
        list.push({
          userId: student.id,
          seat: row.seat_no || "Unassigned",
          student: student.full_name || "Student",
          roll: student.roll_no || "--",
          checkedIn: presentStudentIds.has(student.id),
        });
        manifestByBus.set(row.bus_no, list);
      }

      // 4. Build unified bus list from tripConfig.buses + any bus_no present in assignments
      const allBusIds = Array.from(
        new Set([
          ...Object.keys(tripConfig.buses || {}),
          ...Array.from(manifestByBus.keys()),
        ])
      );

      const built = allBusIds.map((busId) => {
        const cfg = tripConfig.buses?.[busId] || {};
        const manifest = (manifestByBus.get(busId) || []).sort((a, b) =>
          String(a.seat).localeCompare(String(b.seat), undefined, { numeric: true })
        );
        return {
          id: busId,
          name: cfg.name || busId,
          type: cfg.coachType || "",
          regNo: cfg.regNo || "",
          capacity: cfg.capacity || null,
          allocated: manifest.length,
          driverName: cfg.driverName || "",
          driverPhone: cfg.driverPhone || "",
          coordinator:
            [cfg.coordinatorName, cfg.coordinatorPhone ? `(${cfg.coordinatorPhone})` : ""]
              .filter(Boolean)
              .join(" ") || "",
          pickupPoint: cfg.boardingPoint || "",
          pickupTime: cfg.boardingTime || "",
          manifest,
        };
      });

      setBuses(built);
      setSelectedBusId((prev) =>
        built.some((b) => b.id === prev) ? prev : built[0]?.id || ""
      );
    } catch (err) {
      setError(err?.message || "Failed to load transport allocations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadTransportData, 0);
    return () => clearTimeout(t);
  }, [loadTransportData]);

  const currentBus = useMemo(
    () => buses.find((b) => b.id === selectedBusId) || buses[0] || null,
    [buses, selectedBusId]
  );

  const filteredManifest = useMemo(() => {
    if (!currentBus) return [];
    const q = manifestSearch.trim().toLowerCase();
    return currentBus.manifest.filter(
      (p) =>
        !q ||
        p.student.toLowerCase().includes(q) ||
        p.roll.toLowerCase().includes(q) ||
        p.seat.toLowerCase().includes(q)
    );
  }, [currentBus, manifestSearch]);

  const checkedInCount = currentBus
    ? currentBus.manifest.filter((p) => p.checkedIn).length
    : 0;

  const togglePassengerCheckIn = async (passenger) => {
    if (!boardingSession?.id) return;
    setTogglingId(passenger.userId);
    try {
      if (passenger.checkedIn) {
        await attendanceApi.manualUnmark(
          boardingSession.id,
          passenger.userId,
          "Removed from bus boarding manifest"
        );
      } else {
        await attendanceApi.manualMark(boardingSession.id, {
          studentIds: [passenger.userId],
          reason: "Verified on bus boarding manifest",
        });
      }
      setBuses((prev) =>
        prev.map((bus) => {
          if (bus.id !== currentBus.id) return bus;
          return {
            ...bus,
            manifest: bus.manifest.map((p) =>
              p.userId === passenger.userId ? { ...p, checkedIn: !p.checkedIn } : p
            ),
          };
        })
      );
      toast.success(
        `${passenger.student}: ${!passenger.checkedIn ? "Marked Boarded" : "Unmarked"}`
      );
    } catch (err) {
      toast.error(err?.message || "Failed to update boarding status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleExportManifest = () => {
    if (!currentBus || currentBus.manifest.length === 0) {
      toast("No passengers assigned to export.", { icon: "ℹ️" });
      return;
    }
    downloadCsvFile(
      `${currentBus.id}_Passenger_Manifest.csv`,
      ["Seat", "Student Name", "Roll Number", "Boarding Status"],
      currentBus.manifest.map((p) => [
        p.seat,
        p.student,
        p.roll,
        boardingSession ? (p.checkedIn ? "Verified" : "Pending") : "Not Started",
      ])
    );
    toast.success(`Exported ${currentBus.name} manifest CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Fleet &amp; Seating Logistics</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Transport &amp; Vehicle Allocation
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Live vehicle manifests joined from participant assignments and attendance sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTransportData}
          disabled={loading}
          className="inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-xs transition hover:bg-gray-50 disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-12 text-xs font-semibold text-gray-500 shadow-sm ring-1 ring-gray-100">
          <Loader2 size={18} className="animate-spin text-emerald-700" />
          <span>Loading live transport assignments...</span>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <p className="text-xs font-bold text-red-900">{error}</p>
          <button
            type="button"
            onClick={loadTransportData}
            className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      ) : buses.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
          <Bus size={36} className="mx-auto text-emerald-600 opacity-60" />
          <h2 className="mt-3 text-base font-bold text-emerald-950">No Transport Assigned Yet</h2>
          <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
            No vehicles or student bus assignments exist yet. Once vehicles are configured or assigned in the database, manifests will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Bus Selection Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {buses.map((bus) => {
              const isSelected = bus.id === currentBus?.id;
              return (
                <button
                  key={bus.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedBusId(bus.id)}
                  className={`w-full text-left rounded-2xl p-5 transition shadow-sm ring-1 ${isSelected
                    ? "bg-emerald-800 text-white ring-emerald-800 shadow-md"
                    : "bg-white text-gray-900 ring-gray-100 hover:shadow hover:ring-emerald-200"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isSelected ? "bg-emerald-900 text-emerald-200" : "bg-emerald-50 text-emerald-800"
                        }`}
                    >
                      {bus.id}
                    </span>
                    <span
                      className={`text-xs font-semibold ${isSelected ? "text-emerald-200" : "text-gray-500"
                        }`}
                    >
                      {bus.capacity ? `${bus.allocated} / ${bus.capacity} seats` : `${bus.allocated} assigned`}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold sm:text-lg">{bus.name}</h3>
                  {(bus.type || bus.regNo) && (
                    <p
                      className={`text-xs mt-0.5 ${isSelected ? "text-emerald-100" : "text-gray-500"
                        }`}
                    >
                      {[bus.type, bus.regNo].filter(Boolean).join(" • ")}
                    </p>
                  )}

                  {bus.driverName && (
                    <div
                      className={`mt-4 border-t pt-3 text-xs flex justify-between gap-2 ${isSelected ? "border-emerald-700 text-emerald-100" : "border-gray-100 text-gray-500"
                        }`}
                    >
                      <span>Driver: {bus.driverName}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Bus Inspection & Passenger Manifest */}
          {currentBus && (
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8 space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-800 text-white shadow-sm">
                    <Bus size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-emerald-950">{currentBus.name} Logistics</h2>
                    <p className="text-xs text-gray-500">
                      {currentBus.driverName ? (
                        <>
                          Driver: <strong>{currentBus.driverName}</strong>
                          {currentBus.driverPhone ? ` (${currentBus.driverPhone})` : ""}
                        </>
                      ) : (
                        "Driver details not configured yet"
                      )}
                      {currentBus.coordinator ? ` • Coordinator: ${currentBus.coordinator}` : ""}
                    </p>
                  </div>
                </div>

                {currentBus.driverPhone && (
                  <div className="flex items-center gap-3 text-xs">
                    <a
                      href={`tel:${currentBus.driverPhone.replace(/\s+/g, "")}`}
                      className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Phone size={14} />
                      <span>Call Driver</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Pickup & Boarding Timing info */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <span className="text-gray-500 font-semibold uppercase">Pickup Point</span>
                  <p className="mt-1 font-bold text-emerald-950 flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-700" />
                    {currentBus.pickupPoint || "Not assigned yet"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <span className="text-gray-500 font-semibold uppercase">Assembly &amp; Departure</span>
                  <p className="mt-1 font-bold text-emerald-950 flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-700" />
                    {currentBus.pickupTime ? `Assembly ${currentBus.pickupTime}` : "Not assigned yet"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <span className="text-gray-500 font-semibold uppercase">Seat Occupancy</span>
                  <p className="mt-1 font-bold text-emerald-950">
                    {currentBus.capacity
                      ? `${currentBus.allocated} Assigned (${Math.max(0, currentBus.capacity - currentBus.allocated)} Vacant)`
                      : `${currentBus.allocated} Students Assigned`}
                  </p>
                </div>
              </div>

              {/* Passenger Manifest Table + Mobile Cards */}
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-emerald-950 text-sm">
                      Passenger Seat Manifest ({checkedInCount}/{currentBus.manifest.length} Verified)
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {boardingSession
                        ? `Linked to active attendance session: ${boardingSession.title}`
                        : "Read-only manifest. Open a boarding attendance session to verify passengers."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 sm:w-52">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={manifestSearch}
                        onChange={(e) => setManifestSearch(e.target.value)}
                        placeholder="Search seat, name, roll..."
                        aria-label="Search passenger manifest"
                        className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExportManifest}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      <Download size={14} className="text-emerald-700" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {filteredManifest.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-xs text-gray-500">
                    {currentBus.manifest.length === 0
                      ? "No passengers assigned to this vehicle yet."
                      : "No passengers match your search."}
                  </div>
                ) : (
                  <>
                    {/* Mobile Manifest Cards */}
                    <div className="space-y-2 md:hidden">
                      {filteredManifest.map((passenger) => (
                        <div
                          key={passenger.userId}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-black text-emerald-900">
                                {passenger.seat}
                              </span>
                              <span className="truncate font-bold text-gray-900">{passenger.student}</span>
                            </div>
                            <p className="mt-1 font-mono text-[11px] text-gray-500">{passenger.roll}</p>
                          </div>

                          {boardingSession ? (
                            <button
                              type="button"
                              disabled={togglingId === passenger.userId}
                              onClick={() => togglePassengerCheckIn(passenger)}
                              aria-pressed={passenger.checkedIn}
                              className={`shrink-0 inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold transition disabled:opacity-50 ${passenger.checkedIn
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                }`}
                            >
                              {passenger.checkedIn ? (
                                <>
                                  <CheckCircle2 size={11} />
                                  Verified
                                </>
                              ) : (
                                "Mark Boarded"
                              )}
                            </button>
                          ) : (
                            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600">
                              Assigned
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Manifest Table */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-3">Allocated Seat</th>
                            <th className="px-4 py-3">Student Name</th>
                            <th className="px-4 py-3">Roll Number</th>
                            <th className="px-4 py-3">Boarding Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredManifest.map((passenger) => (
                            <tr key={passenger.userId} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-bold text-emerald-900">{passenger.seat}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{passenger.student}</td>
                              <td className="px-4 py-3 font-mono text-gray-500">{passenger.roll}</td>
                              <td className="px-4 py-3">
                                {boardingSession ? (
                                  <button
                                    type="button"
                                    disabled={togglingId === passenger.userId}
                                    onClick={() => togglePassengerCheckIn(passenger)}
                                    aria-pressed={passenger.checkedIn}
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition disabled:opacity-50 ${passenger.checkedIn
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                      }`}
                                  >
                                    {passenger.checkedIn ? (
                                      <>
                                        <CheckCircle2 size={11} />
                                        Verified
                                      </>
                                    ) : (
                                      "Pending — Mark Boarded"
                                    )}
                                  </button>
                                ) : (
                                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600">
                                    Assigned (No Active Session)
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
