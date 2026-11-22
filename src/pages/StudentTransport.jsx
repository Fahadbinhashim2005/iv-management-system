import { 
  Bus, 
  User, 
  Phone, 
  ShieldCheck, 
  Wifi, 
  Zap, 
  Airplay
} from "lucide-react";

export default function StudentTransport() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-700">Travel & Logistics</p>
        <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
          Assigned Transport
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your travel vehicle details, designated seating, driver contacts, and route checkpoints.
        </p>
      </div>

      {/* Main Bus Overview Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <Bus size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  Bus 04 (Alpha Unit)
                </span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                  Volvo 9600 Multi-Axle AC
                </span>
              </div>
              <h2 className="mt-1 text-xl font-extrabold text-emerald-950 sm:text-2xl">
                Registration: GJ-01-BX-8824
              </h2>
              <p className="text-xs text-gray-500">
                Capacity: 45 Students • Air-Suspension Luxury Coach
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-center md:min-w-[180px]">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Your Allocated Seat
            </p>
            <p className="mt-1 text-3xl font-black text-emerald-950">
              14A
            </p>
            <p className="text-[11px] text-gray-500">Window Seat • Left Side</p>
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
              <h3 className="font-bold text-emerald-950">Mr. Suresh Patel</h3>
              <p className="text-xs text-gray-500">12+ Years Commercial Tourist Experience</p>
            </div>
          </div>
          <a
            href="tel:+919876543210"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            <Phone size={15} />
            <span>Call Driver (+91 98765 43210)</span>
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
              <h3 className="font-bold text-emerald-950">Prof. Anjali Menon</h3>
              <p className="text-xs text-gray-500">Dept. of Computer Science & Engineering</p>
            </div>
          </div>
          <a
            href="tel:+919812345678"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            <Phone size={15} />
            <span>Call Coordinator (+91 98123 45678)</span>
          </a>
        </div>
      </div>

      {/* Boarding Instructions */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-emerald-950">Boarding & Transit Rules</h3>
        <ul className="mt-3 space-y-2 text-xs text-gray-600 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-600">•</span>
            Students must be seated in their designated seat (14A) 15 minutes before scheduled departure.
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
