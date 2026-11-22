import { useState } from "react";
import { 
  MapPin, 
  Phone, 
  Search, 
  Building2
} from "lucide-react";

export default function CoordinatorAccommodation() {
  const [searchTerm, setSearchTerm] = useState("");
  const [floorFilter, setFloorFilter] = useState("All");

  const rooms = [
    {
      roomNo: "304",
      floor: "3rd Floor",
      type: "Deluxe Triple",
      capacity: 3,
      gender: "Male",
      status: "Fully Occupied",
      occupants: [
        { name: "Fahad Bin Hashim", roll: "CS-2026-084", keyHolder: true },
        { name: "Rohan Varma", roll: "CS-2026-091", keyHolder: false },
        { name: "Aditya Nair", roll: "CS-2026-015", keyHolder: false },
      ],
    },
    {
      roomNo: "305",
      floor: "3rd Floor",
      type: "Deluxe Triple",
      capacity: 3,
      gender: "Male",
      status: "Fully Occupied",
      occupants: [
        { name: "Arjun Verma", roll: "CS-2026-004", keyHolder: true },
        { name: "Deepak S", roll: "CS-2026-031", keyHolder: false },
        { name: "Nikhil Joshi", roll: "CS-2026-079", keyHolder: false },
      ],
    },
    {
      roomNo: "201",
      floor: "2nd Floor",
      type: "Deluxe Twin",
      capacity: 2,
      gender: "Female",
      status: "Fully Occupied",
      occupants: [
        { name: "Ananya Iyer", roll: "CS-2026-022", keyHolder: true },
        { name: "Kavya Ramesh", roll: "CS-2026-056", keyHolder: false },
      ],
    },
    {
      roomNo: "202",
      floor: "2nd Floor",
      type: "Deluxe Triple",
      capacity: 3,
      gender: "Female",
      status: "1 Slot Vacant",
      occupants: [
        { name: "Sneha Sharma", roll: "CS-2026-042", keyHolder: true },
        { name: "Meera Pillai", roll: "CS-2026-077", keyHolder: false },
      ],
    },
    {
      roomNo: "401",
      floor: "4th Floor",
      type: "Staff Suite",
      capacity: 2,
      gender: "Faculty",
      status: "Faculty Suite",
      occupants: [
        { name: "Dr. Rajesh Kumar", roll: "HOD CSE", keyHolder: true },
        { name: "Prof. Vikram Mohan", roll: "Faculty", keyHolder: false },
      ],
    },
  ];

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.roomNo.includes(searchTerm) ||
      r.occupants.some((o) => o.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFloor = floorFilter === "All" || r.floor === floorFilter;
    return matchesSearch && matchesFloor;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Hospitality & Lodging Management</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Accommodation & Room Roster
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Manage partner hotel room allotments, key distributions, and occupancy audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="tel:+917926581234"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Phone size={15} className="text-emerald-800" />
            <span>Front Desk (+91 79 2658 1234)</span>
          </a>
        </div>
      </div>

      {/* Hotel Property Overview Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 shadow-sm">
              <Building2 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                  Partner Hotel (4-Star)
                </span>
                <span className="text-xs text-gray-500">• 45 Rooms Reserved</span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-emerald-950 sm:text-2xl">
                Hotel Grand Ambience Ahmedabad
              </h2>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={13} className="text-emerald-700" />
                Ashram Road, Riverfront West, Ahmedabad 380009
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="rounded-xl bg-gray-50 p-3 text-center min-w-[120px]">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Check-in</span>
              <p className="mt-0.5 font-bold text-emerald-950">Dec 5 • 02:00 PM</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center min-w-[120px]">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Checkout</span>
              <p className="mt-0.5 font-bold text-emerald-950">Dec 8 • 08:00 AM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search room # or student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {["All", "2nd Floor", "3rd Floor", "4th Floor"].map((floor) => (
            <button
              key={floor}
              type="button"
              onClick={() => setFloorFilter(floor)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shrink-0 ${
                floorFilter === floor
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRooms.map((room) => (
          <div
            key={room.roomNo}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-black text-emerald-950">Room #{room.roomNo}</span>
                <p className="text-[11px] text-gray-500">{room.floor} • {room.type}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  room.status === "Fully Occupied"
                    ? "bg-emerald-100 text-emerald-800"
                    : room.status === "Faculty Suite"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {room.status}
              </span>
            </div>

            {/* Occupants list */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Occupants ({room.occupants.length}/{room.capacity})
              </p>
              {room.occupants.map((occ, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-gray-900">{occ.name}</p>
                    <p className="text-[10px] text-gray-500">{occ.roll}</p>
                  </div>
                  {occ.keyHolder && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                      Key Holder 🔑
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
