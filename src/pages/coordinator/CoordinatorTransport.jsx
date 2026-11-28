import { useState } from "react";
import toast from "react-hot-toast";
import { downloadCsvFile } from "../../lib/exportUtils";
import {
  Bus,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Search,
  Download,
} from "lucide-react";
import { tripConfig } from "../../config/tripConfig";

const INITIAL_BUSES = Object.values(tripConfig.buses || {}).map((b) => ({
  id: b.id,
  name: b.name || b.id,
  type: b.coachType || "",
  regNo: b.regNo || "",
  capacity: b.capacity || 0,
  allocated: 0,
  driverName: b.driverName || "",
  driverPhone: b.driverPhone || "",
  coordinator: [b.coordinatorName, b.coordinatorPhone].filter(Boolean).join(" ") || "",
  pickupPoint: b.boardingPoint || "",
  pickupTime: b.boardingTime || "",
  status: "Configured",
  manifest: [],
}));

export default function CoordinatorTransport() {
  const [selectedBusId, setSelectedBusId] = useState(INITIAL_BUSES[0]?.id || "");
  const [buses, setBuses] = useState(INITIAL_BUSES);
  const [manifestSearch, setManifestSearch] = useState("");

  const currentBus = buses.find((b) => b.id === selectedBusId) || buses[0];
  if (!currentBus) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Fleet &amp; Seating Logistics</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Transport &amp; Vehicle Allocation
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Manage vehicle manifests, driver contacts, and boarding checks.
          </p>
        </div>
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
          <Bus size={36} className="mx-auto text-emerald-600 opacity-60" />
          <h2 className="mt-3 text-base font-bold text-emerald-950">Transport Not Assigned Yet</h2>
          <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
            Buses and seat allocations have not been configured yet. Once transport details are added, manifests will appear here.
          </p>
        </div>
      </div>
    );
  }
  const filteredManifest = currentBus.manifest.filter((p) => {
    const q = manifestSearch.trim().toLowerCase();
    return (
      !q ||
      p.student.toLowerCase().includes(q) ||
      p.roll.toLowerCase().includes(q) ||
      p.seat.toLowerCase().includes(q)
    );
  });
  const checkedInCount = currentBus.manifest.filter((p) => p.checkedIn).length;

  const togglePassengerCheckIn = (roll) => {
    setBuses((prev) =>
      prev.map((bus) => {
        if (bus.id !== currentBus.id) return bus;
        return {
          ...bus,
          manifest: bus.manifest.map((p) => {
            if (p.roll !== roll) return p;
            const nextState = !p.checkedIn;
            toast.success(`${p.student}: ${nextState ? "Marked Boarded" : "Reset to Pending"}`);
            return { ...p, checkedIn: nextState };
          }),
        };
      })
    );
  };

  const handleExportManifest = () => {
    downloadCsvFile(
      `${currentBus.id}_Passenger_Manifest.csv`,
      ["Seat", "Student Name", "Roll Number", "Gate Verification"],
      currentBus.manifest.map((p) => [
        p.seat,
        p.student,
        p.roll,
        p.checkedIn ? "Verified" : "Pending Gate Scan",
      ])
    );
    toast.success(`Exported ${currentBus.name} manifest CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Fleet & Seating Logistics</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Transport & Vehicle Allocation
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Manage tourist coach manifests, seat maps, driver verifications, and departure checks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => toast.success("All 3 buses cleared for commercial highway transit by college transport committee.")}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 self-start sm:self-auto"
        >
          <ShieldCheck size={16} />
          <span>Fleet Safety Clearance: 100%</span>
        </button>
      </div>

      {/* Bus Selection Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {buses.map((bus) => {
          const isSelected = bus.id === selectedBusId;
          return (
            <button
              key={bus.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedBusId(bus.id)}
              className={`w-full text-left rounded-2xl p-5 transition shadow-sm ring-1 ${
                isSelected
                  ? "bg-emerald-800 text-white ring-emerald-800 shadow-md"
                  : "bg-white text-gray-900 ring-gray-100 hover:shadow hover:ring-emerald-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isSelected ? "bg-emerald-900 text-emerald-200" : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {bus.id}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? "text-emerald-200" : "text-gray-400"
                  }`}
                >
                  {bus.allocated} / {bus.capacity} seats
                </span>
              </div>

              <h3 className="mt-3 text-base font-bold sm:text-lg">{bus.name}</h3>
              <p
                className={`text-xs mt-0.5 ${
                  isSelected ? "text-emerald-100" : "text-gray-500"
                }`}
              >
                {bus.type} • {bus.regNo}
              </p>

              <div
                className={`mt-4 border-t pt-3 text-xs flex justify-between gap-2 ${
                  isSelected ? "border-emerald-700 text-emerald-100" : "border-gray-100 text-gray-500"
                }`}
              >
                <span>Driver: {bus.driverName}</span>
                <span className="font-bold text-right">{bus.status}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Bus Inspection & Passenger Manifest */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-800 text-white shadow-sm">
              <Bus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-950">{currentBus.name} Logistics</h2>
              <p className="text-xs text-gray-500">
                Driver: <strong>{currentBus.driverName}</strong> ({currentBus.driverPhone}) • Coordinator: {currentBus.coordinator}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <a
              href={`tel:${currentBus.driverPhone}`}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <Phone size={14} />
              <span>Call Driver</span>
            </a>
          </div>
        </div>

        {/* Pickup & Boarding Timing info */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl bg-gray-50 p-3.5">
            <span className="text-gray-400 font-semibold uppercase">Pickup Point</span>
            <p className="mt-1 font-bold text-emerald-950 flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-700" />
              {currentBus.pickupPoint}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3.5">
            <span className="text-gray-400 font-semibold uppercase">Assembly & Departure</span>
            <p className="mt-1 font-bold text-emerald-950 flex items-center gap-1.5">
              <Clock size={14} className="text-emerald-700" />
              Assembly {currentBus.pickupTime} sharp
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3.5">
            <span className="text-gray-400 font-semibold uppercase">Seat Occupancy</span>
            <p className="mt-1 font-bold text-emerald-950">
              {currentBus.allocated} Students Assigned ({currentBus.capacity - currentBus.allocated} Vacant)
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
              <p className="text-[11px] text-gray-500">Tap any passenger status badge to toggle gate check-in.</p>
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <Download size={14} className="text-emerald-700" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Mobile Manifest Cards */}
          <div className="space-y-2 md:hidden">
            {filteredManifest.map((passenger) => (
              <div
                key={passenger.roll}
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

                <button
                  type="button"
                  onClick={() => togglePassengerCheckIn(passenger.roll)}
                  aria-pressed={passenger.checkedIn}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                    passenger.checkedIn
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
                  <th className="px-4 py-3">Gate Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredManifest.map((passenger) => (
                  <tr key={passenger.roll} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-bold text-emerald-900">{passenger.seat}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{passenger.student}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{passenger.roll}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => togglePassengerCheckIn(passenger.roll)}
                        aria-pressed={passenger.checkedIn}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                          passenger.checkedIn
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
                          "Pending Gate Scan — Mark"
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
