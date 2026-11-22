import { useState } from "react";
import { 
  Bus, 
  Phone, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  CheckCircle2
} from "lucide-react";

export default function CoordinatorTransport() {
  const [selectedBusId, setSelectedBusId] = useState("BUS-04");

  const buses = [
    {
      id: "BUS-04",
      name: "Bus 04 (Alpha Unit)",
      type: "Volvo 9600 Multi-Axle AC",
      regNo: "GJ-01-BX-8824",
      capacity: 45,
      allocated: 43,
      driverName: "Mr. Suresh Patel",
      driverPhone: "+91 98765 43210",
      coordinator: "Prof. Anjali Menon (+91 98123 45678)",
      pickupPoint: "College Gate #2 Main Parking",
      pickupTime: "06:00 AM",
      status: "Ready for Departure",
      manifest: [
        { seat: "01A", student: "Arjun Verma", roll: "CS-2026-004", checkedIn: true },
        { seat: "01B", student: "Deepak S", roll: "CS-2026-031", checkedIn: true },
        { seat: "14A", student: "Fahad Bin Hashim", roll: "CS-2026-084", checkedIn: true },
        { seat: "14B", student: "Rohan Varma", roll: "CS-2026-091", checkedIn: true },
        { seat: "15A", student: "Aditya Nair", roll: "CS-2026-015", checkedIn: true },
        { seat: "15B", student: "Manish K", roll: "CS-2026-062", checkedIn: false },
      ],
    },
    {
      id: "BUS-01",
      name: "Bus 01 (Beta Unit)",
      type: "BharatBenz Glider AC",
      regNo: "GJ-01-CT-4412",
      capacity: 45,
      allocated: 45,
      driverName: "Mr. Ramesh Kumar",
      driverPhone: "+91 97451 22334",
      coordinator: "Prof. Vikram Mohan (+91 94460 11223)",
      pickupPoint: "College Gate #1 North Wing",
      pickupTime: "06:15 AM",
      status: "Inspection Completed",
      manifest: [
        { seat: "06A", student: "Ananya Iyer", roll: "CS-2026-022", checkedIn: true },
        { seat: "06B", student: "Kavya Ramesh", roll: "CS-2026-056", checkedIn: true },
        { seat: "07A", student: "Nikhil Joshi", roll: "CS-2026-079", checkedIn: true },
      ],
    },
    {
      id: "BUS-02",
      name: "Bus 02 (Gamma Unit)",
      type: "Scania Metrolink AC",
      regNo: "GJ-01-DD-9102",
      capacity: 45,
      allocated: 40,
      driverName: "Mr. Harish Patel",
      driverPhone: "+91 98950 44556",
      coordinator: "Dr. Rajesh Kumar (+91 94471 23456)",
      pickupPoint: "College Auditorium Gate",
      pickupTime: "06:00 AM",
      status: "Ready for Departure",
      manifest: [
        { seat: "11A", student: "Sneha Sharma", roll: "CS-2026-042", checkedIn: false },
        { seat: "11B", student: "Vignesh Rajan", roll: "CS-2026-118", checkedIn: false },
      ],
    },
  ];

  const currentBus = buses.find((b) => b.id === selectedBusId) || buses[0];

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
          onClick={() => alert("All 3 buses cleared for commercial highway transit by college transport committee.")}
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
            <div
              key={bus.id}
              onClick={() => setSelectedBusId(bus.id)}
              className={`cursor-pointer rounded-2xl p-5 transition shadow-sm ring-1 ${
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
                className={`mt-4 border-t pt-3 text-xs flex justify-between ${
                  isSelected ? "border-emerald-700 text-emerald-100" : "border-gray-100 text-gray-500"
                }`}
              >
                <span>Driver: {bus.driverName}</span>
                <span className="font-bold">{bus.status}</span>
              </div>
            </div>
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

        {/* Passenger Manifest Table */}
        <div>
          <h3 className="font-bold text-emerald-950 text-sm mb-3">Passenger Seat Manifest</h3>
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
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
                {currentBus.manifest.map((passenger, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-bold text-emerald-900">{passenger.seat}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{passenger.student}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{passenger.roll}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          passenger.checkedIn
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {passenger.checkedIn ? (
                          <>
                            <CheckCircle2 size={11} />
                            Verified
                          </>
                        ) : (
                          "Pending Gate Scan"
                        )}
                      </span>
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
