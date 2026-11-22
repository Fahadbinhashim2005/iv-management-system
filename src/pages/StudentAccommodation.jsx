import { 
  BedDouble, 
  MapPin, 
  Phone, 
  Clock, 
  Coffee, 
  Wifi
} from "lucide-react";

export default function StudentAccommodation() {
  const roommates = [
    { name: "Fahad Bin Hashim", roll: "CS-2026-084", role: "You" },
    { name: "Rohan Varma", roll: "CS-2026-091", role: "Roommate" },
    { name: "Aditya Nair", roll: "CS-2026-015", role: "Roommate" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-700">Stay & Hospitality</p>
        <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
          Accommodation Details
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your hotel information, allocated room number, roommates, and reception contacts.
        </p>
      </div>

      {/* Hotel Showcase Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md">
              <BedDouble size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                  4-Star Partner Hotel
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  Verified Safety
                </span>
              </div>
              <h2 className="mt-1 text-xl font-extrabold text-emerald-950 sm:text-2xl">
                Hotel Grand Ambience
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin size={14} className="text-emerald-600" />
                <span>Ashram Road, Riverfront West, Ahmedabad, Gujarat 380009</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 text-center md:min-w-[180px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">
              Allocated Room
            </p>
            <p className="mt-1 text-3xl font-black text-emerald-950">
              #304
            </p>
            <p className="text-[11px] text-gray-500">3rd Floor • Deluxe Triple</p>
          </div>
        </div>

        {/* Timings & Amenities */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-gray-100 pt-6 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-700">
            <Clock size={16} className="text-emerald-600" />
            <span>Check-in: 02:00 PM</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-700">
            <Clock size={16} className="text-amber-600" />
            <span>Checkout: 08:00 AM</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-700">
            <Coffee size={16} className="text-blue-600" />
            <span>Buffet Breakfast Included</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-700">
            <Wifi size={16} className="text-purple-600" />
            <span>Complimentary High-Speed Wi-Fi</span>
          </div>
        </div>
      </div>

      {/* Roommates & Front Desk */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Roommates Card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-emerald-950">Room 304 Occupants</h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              3 Students
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {roommates.map((person, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-gray-50/70 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-800">
                    {person.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950">{person.name}</p>
                    <p className="text-gray-500">{person.roll}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    person.role === "You"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {person.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Front Desk & Emergency */}
        <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-emerald-950">Hotel Reception & Helpline</h3>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                24/7 Desk
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Dial extension <span className="font-bold text-emerald-800">9</span> from your room intercom for housekeeping or room service inquiries.
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <a
              href="tel:+917926581234"
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
            >
              <Phone size={15} />
              <span>Reception (+91 79 2658 1234)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
