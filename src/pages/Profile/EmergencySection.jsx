import { Heart, Lock, UserCheck, AlertCircle } from "lucide-react";

const RELATIONS = ["Father", "Mother", "Guardian", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/**
 * ==============================================================================
 * EmergencySection Component
 * ==============================================================================
 * Gathers essential health & emergency contact credentials required for student
 * safety during industrial visit transit.
 */
export default function EmergencySection({ formData, tripAssignment, errors, onChange }) {
  const mentorDisplay = tripAssignment?.faculty_mentor || "Prof. Anjali Menon";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700 shadow-inner">
          <Heart size={18} />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-emerald-950">Emergency Contacts & Medical Safety</h3>
          <p className="text-xs text-gray-500">Crucial information accessed by tour coordinators in an emergency</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Guardian Name */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Guardian / Parent Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.guardian_name}
            onChange={(e) => onChange("guardian_name", e.target.value)}
            placeholder="e.g. Mr. Rajesh Sharma"
            className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${
              errors.guardian_name ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            }`}
          />
          {errors.guardian_name && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.guardian_name}</p>}
        </div>

        {/* Guardian Relation */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Relationship</label>
          <select
            value={formData.guardian_relation}
            onChange={(e) => onChange("guardian_relation", e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            {RELATIONS.map((rel) => (
              <option key={rel} value={rel}>
                {rel}
              </option>
            ))}
          </select>
        </div>

        {/* Emergency Phone */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Emergency Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.emergency_phone}
            onChange={(e) => onChange("emergency_phone", e.target.value)}
            placeholder="+91 94471 23456"
            className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${
              errors.emergency_phone ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            }`}
          />
          {errors.emergency_phone && (
            <p className="mt-1 text-[11px] font-medium text-red-600">{errors.emergency_phone}</p>
          )}
          {errors.emergency_phone_warning && (
            <p className="mt-1 text-[11px] font-medium text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} />
              <span>{errors.emergency_phone_warning}</span>
            </p>
          )}
        </div>

        {/* Blood Group */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Blood Group <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.blood_group}
            onChange={(e) => onChange("blood_group", e.target.value)}
            className={`w-full rounded-xl border bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:bg-white focus:outline-none ${
              errors.blood_group ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            }`}
          >
            <option value="">Select Blood Group...</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
          {errors.blood_group && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.blood_group}</p>}
        </div>

        {/* Medical Notes / Allergies */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gray-700">
              Medical Notes / Severe Allergies (Optional)
            </label>
            <span className="text-[10px] text-gray-400">
              {(formData.medical_notes || "").length}/500 chars
            </span>
          </div>
          <textarea
            rows={3}
            maxLength={500}
            value={formData.medical_notes}
            onChange={(e) => onChange("medical_notes", e.target.value)}
            placeholder="e.g. Asthma inhaler carried; allergic to penicillin or peanuts. Leave blank if none."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs font-medium text-gray-900 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Only what tour coordinators & emergency medical staff need to know in a medical emergency.
          </p>
        </div>
      </div>

      {/* Admin Assigned Mentor (Read-Only) */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-2">
          <Lock size={12} />
          <span>Trip Mentorship</span>
        </p>

        <div className="flex items-center justify-between rounded-xl bg-gray-50/80 p-3 ring-1 ring-gray-100 text-xs">
          <span className="flex items-center gap-2 text-gray-500">
            <UserCheck size={16} className="text-emerald-700" />
            <span>Assigned Faculty Mentor</span>
          </span>
          <span className="font-bold text-emerald-950">{mentorDisplay}</span>
        </div>
      </div>
    </div>
  );
}
