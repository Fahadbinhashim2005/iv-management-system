import {
  Bus,
  User,
  Phone,
  ShieldCheck,
  Wifi,
  Zap,
  Airplay,
  Copy,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import { useProfile } from "../hooks/useProfile";
import { tripConfig } from "../config/tripConfig";

export default function StudentTransport() {
  const { profile, tripAssignment } = useProfile();

  const busId = tripAssignment?.bus_no || tripAssignment?.bus_number || "";
  const busConfig = busId ? tripConfig.buses[busId] : null;
  const busName = busConfig?.name || busId || "Not assigned yet";
  const coachType = busConfig?.coachType || "";
  const regNo = busConfig?.regNo || "";
  const seatNo = tripAssignment?.seat_no || tripAssignment?.seat_number || "";
  const seatNote = tripAssignment?.seat_note || "";
  const boardingPoint = busConfig?.boardingPoint || "";
  const driverName = busConfig?.driverName || "";
  const driverPhone = busConfig?.driverPhone || "";
  const coordName = busConfig?.coordinatorName || "";
  const coordPhone = busConfig?.coordinatorPhone || "";

  const copyBoardingPass = async () => {
    const passText = [
      `IV Connect Boarding Pass`,
      `Passenger: ${profile?.full_name || "Student"}`,
      `Unit: ${busName} (${regNo})`,
      `Seat: ${seatNo} (${seatNote})`,
      `Boarding Point: ${boardingPoint}`,
      `Driver: ${driverName} (${driverPhone})`,
      `Coordinator: ${coordName} (${coordPhone})`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(passText);
      toast.success("Boarding details copied to clipboard.");
    } catch {
      toast.error("Could not copy automatically. Please copy manually.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Travel & Logistics</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Assigned Transport
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your travel vehicle details, designated seating, driver contacts, and route checkpoints.
          </p>
        </div>

        <button
          type="button"
          onClick={copyBoardingPass}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-xs transition hover:bg-emerald-50 sm:self-auto"
        >
          <Copy size={14} />
          <span>Copy Boarding Pass</span>
        </button>
      </div>

      {/* Main Bus Overview Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <Bus size={30} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  {busName}
                </span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                  {coachType}
                </span>
              </div>
              <h2 className="mt-1.5 text-lg font-extrabold text-emerald-950 sm:text-2xl">
                Registration: {regNo}
              </h2>
              <p className="text-xs text-gray-500">
                Capacity: 45 Students • Air-Suspension Luxury Coach
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <MapPin size={13} className="shrink-0" />
                <span>{boardingPoint}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-center md:min-w-[180px]">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Your Allocated Seat
            </p>
            <p className="mt-1 text-3xl font-black text-emerald-950">
              {seatNo}
            </p>
            <p className="text-[11px] text-gray-500">{seatNote}</p>
          </div>
        </div>

        {/* Bus Amenities */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-gray-100 pt-6 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-700">
            <Wifi size={16} className="text-emerald-600" />
            <span>Onboard Wi-Fi</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-700">
            <Zap size={16} className="text-amber-600" />
            <span>USB Charging Ports</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-700">
            <Airplay size={16} className="text-blue-600" />
            <span>Climate Control AC</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-700">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>First Aid & GPS</span>
          </div>
        </div>
      </div>

      {/* Driver & Coordinator Contact Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Driver Card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Primary Driver
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Verified License
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <User size={24} />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950">{driverName}</h3>
              <p className="text-xs text-gray-500">12+ Years Commercial Tourist Experience</p>
            </div>
          </div>
          <a
            href={`tel:${driverPhone.replace(/\s+/g, "")}`}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            <Phone size={15} />
            <span>Call Driver ({driverPhone})</span>
          </a>
        </div>

        {/* Bus Faculty Coordinator */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Bus Coordinator
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Faculty In-Charge
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <User size={24} />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950">{coordName}</h3>
              <p className="text-xs text-gray-500">Dept. of Computer Science & Engineering</p>
            </div>
          </div>
          <a
            href={`tel:${coordPhone.replace(/\s+/g, "")}`}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            <Phone size={15} />
            <span>Call Coordinator ({coordPhone})</span>
          </a>
        </div>
      </div>

      {/* Boarding Instructions */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-emerald-950">Boarding & Transit Rules</h3>
        <ul className="mt-3 space-y-2 text-xs text-gray-600 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-600">•</span>
            Students must be seated in their designated seat ({seatNo}) 15 minutes before scheduled departure.
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-600">•</span>
            Baggage weight is limited to 1 trolley bag + 1 backpack.
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-600">•</span>
            Always wear seatbelts when the bus is in motion on expressways.
          </li>
        </ul>
      </div>
    </div>
  );
}
