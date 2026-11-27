import { GraduationCap, UserCheck, Users } from "lucide-react";

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

  export default function AcademicSection({ role = "student", formData, errors, onChange }) {
    const normalizedRole = String(role || "student").toLowerCase();
    const isCoordinator = normalizedRole === "coordinator";
    const isStudentLike =
      normalizedRole === "student" ||
      (isCoordinator && formData.coordinator_type === "student");

    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-5">
        {/* Section Header */}
        <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-inner">
            <GraduationCap size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-emerald-950">Academic &amp; Identity Info</h3>
            <p className="text-xs text-gray-500">
              {isCoordinator
                ? "Select your coordinator type and keep your contact details up to date"
                : "Your department credentials and personal contact details"}
            </p>
          </div>
        </div>

        {/* Coordinator Role Type Selector */}
        {isCoordinator && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              Coordinator Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Coordinator Type">
              <button
                type="button"
                aria-pressed={formData.coordinator_type !== "student"}
                onClick={() => onChange("coordinator_type", "faculty")}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${formData.coordinator_type !== "student"
                    ? "border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700"
                    : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                  }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${formData.coordinator_type !== "student"
                      ? "bg-emerald-800 text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                    }`}
                >
                  <UserCheck size={17} />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-emerald-950">Faculty Coordinator</p>
                  <p className="text-[11px] text-gray-500">Contact, blood group, medical &amp; meal alerts</p>
                </div>
              </button>

              <button
                type="button"
                aria-pressed={formData.coordinator_type === "student"}
                onClick={() => onChange("coordinator_type", "student")}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${formData.coordinator_type === "student"
                    ? "border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700"
                    : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                  }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${formData.coordinator_type === "student"
                      ? "bg-emerald-800 text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                    }`}
                >
                  <Users size={17} />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-emerald-950">Student Coordinator</p>
                  <p className="text-[11px] text-gray-500">Full student academic, guardian &amp; consent profile</p>
                </div>
              </button>
            </div>
          </div>
        )}

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
              className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${errors.full_name ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                }`}
            />
            {errors.full_name && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.full_name}</p>}
          </div>

            {/* Roll Number (Students & Student Coordinators) */ }
        {isStudentLike && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Roll Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.roll_no}
                onChange={(e) => onChange("roll_no", e.target.value.toUpperCase())}
                placeholder="e.g. CS-2026-104"
                className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${errors.roll_no ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  }`}
              />
              {errors.roll_no && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.roll_no}</p>}
            </div>
          )}

          {/* Phone */}
            <div className={isStudentLike ? "" : "sm:col-span-2"}>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {isStudentLike ? "Student Phone Number" : "Contact Phone Number"} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${errors.phone ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
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

              {/* Semester & Batch (Students & Student Coordinators) */ }
        {isStudentLike && (
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
                    className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${errors.batch ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      }`}
                  />
                  {errors.batch && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.batch}</p>}
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
                className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${errors.gender
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
        </div>
        );
}
