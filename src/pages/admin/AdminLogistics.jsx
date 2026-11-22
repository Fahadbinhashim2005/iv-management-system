import { 
  Bus, 
  Building2, 
  CheckCircle2
} from "lucide-react";

export default function AdminLogistics() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-800">Vendor Management</p>
        <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
          Fleet & Hospitality Contracts
        </h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Commercial agreements, passenger accidental insurance policies, and hotel procurement terms.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Bus Fleet Vendor Contract */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <Bus size={22} />
              </div>
              <div>
                <h3 className="font-bold text-emerald-950 text-base">Gujarat State Tourist Fleet</h3>
                <p className="text-xs text-gray-500">Contract #GST-TR-2026-441</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
              Contract Executed
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Contracted Coaches:</span>
              <span className="font-bold text-emerald-950">3 Volvo 9600 Multi-Axle AC (135 Seats)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Total Contract Value:</span>
              <span className="font-bold text-emerald-950">₹2,18,000 (Includes Fuel & Tolls)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Transit Insurance:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={13} />
                ₹10,00,000 / Passenger Covered
              </span>
            </div>
          </div>
        </div>

        {/* Hotel Contract */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                <Building2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-emerald-950 text-base">Hotel Grand Ambience</h3>
                <p className="text-xs text-gray-500">MoU #HGA-AHM-2026-08</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
              Contract Executed
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Rooms Blocked:</span>
              <span className="font-bold text-emerald-950">45 Deluxe Rooms (135 Beds)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Package Deal:</span>
              <span className="font-bold text-emerald-950">₹1,94,000 (Includes Buffet Breakfast)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Dedicated Security:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={13} />
                24/7 Floor Attendants Provided
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
