import { GraduationCap, Lock, Bus, BedDouble } from "lucide-react";

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Information Technology",
  "Other",
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * ==============================================================================
 * AcademicSection Component
 * ==============================================================================
 * Renders editable academic & identity attributes (Department, Semester, Batch, Roll, Phone)
 * side-by-side with locked, admin-assigned logistics (Bus, Seat, Hotel Room).
 */
export default function AcademicSection({ role = "student", formData, tripAssignment, errors, onChange }) {
  const isStudent = String(role || "student").toLowerCase() === "student";
  const busDisplay = tripAssignment?.bus_no 
    ? `${tripAssignment.bus_no} ${tripAssignment.seat_no ? `• Seat ${tripAssignment.seat_no}` : ""}` 
    : "Not assigned yet";

  const roomDisplay = tripAssignment?.room_no 
    ? `${tripAssignment.room_no} ${tripAssignment.hotel_name ? `(${tripAssignment.hotel_name})` : ""}` 
    : "Not assigned yet";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-inner">
          <GraduationCap size={18} />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-emerald-950">Academic & Tour Info</h3>
          <p className="text-xs text-gray-500">Your department credentials and assigned travel logistics</p>
        </div>
      </div>

      {/* Editable Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => onChange("full_name", e.target.value)}
            placeholder="e.g. Fahad Bin Hashim"
            className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${
              errors.full_name ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            }`}
          />
          {errors.full_name && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.full_name}</p>}
        </div>

        {/* Roll Number (Students only) */}
        {isStudent && (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Roll Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.roll_no}
              onChange={(e) => onChange("roll_no", e.target.value.toUpperCase())}
              placeholder="e.g. CS-2026-104"
              className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${
                errors.roll_no ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              }`}
            />
            {errors.roll_no && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.roll_no}</p>}
          </div>
        )}

        {/* Phone */}
        <div className={isStudent ? "" : "sm:col-span-2"}>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {isStudent ? "Student Phone Number" : "Contact Phone Number"} <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="+91 98765 43210"
            className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${
              errors.phone ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            }`}
          />
          {errors.phone && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.phone}</p>}
        </div>

        {/* Department Dropdown */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.department}
            onChange={(e) => onChange("department", e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Semester & Batch (Students only) */}
        {isStudent && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Semester <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.semester}
                onChange={(e) => onChange("semester", Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Batch <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.batch}
                onChange={(e) => onChange("batch", e.target.value)}
                placeholder="e.g. 2023-27"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </>
        )}

        {/* Gender (for Room Allocation) */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Gender <span className="text-[11px] font-semibold text-emerald-700">(For Room Allocation)</span>
          </label>
          <select
            value={formData.gender || ""}
            onChange={(e) => onChange("gender", e.target.value)}
            className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${
              errors.gender
                ? "border-red-400 ring-1 ring-red-400"
                : !formData.gender
                  ? "border-amber-300 bg-amber-50/40 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            }`}
          >
            <option value="">Select gender...</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
          {errors.gender ? (
            <p className="mt-1 text-[11px] font-medium text-red-600">{errors.gender}</p>
          ) : (
            <p className="mt-1 text-[11px] text-gray-500">
              Required for selecting boys or girls rooms during hotel room allocation.
            </p>
          )}
        </div>
      </div>

      {/* Admin-Assigned Logistical Details (Read-Only for students) */}
      {isStudent && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <Lock size={12} />
          <span>Tour Logistics (Assigned by Admin)</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between rounded-xl bg-gray-50/80 p-3 ring-1 ring-gray-100">
            <span className="flex items-center gap-2 text-gray-500">
              <Bus size={15} className="text-emerald-700" />
              <span>Assigned Bus</span>
            </span>
            <span className="font-bold text-emerald-950">{busDisplay}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50/80 p-3 ring-1 ring-gray-100">
            <span className="flex items-center gap-2 text-gray-500">
              <BedDouble size={15} className="text-emerald-700" />
              <span>Hotel & Room</span>
            </span>
            <span className="font-bold text-emerald-950">{roomDisplay}</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
