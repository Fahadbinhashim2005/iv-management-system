import { Bell, Utensils, ShieldCheck, Check } from "lucide-react";

const DIETARY_OPTIONS = [
  { value: "Veg", label: "Vegetarian" },
  { value: "Non-veg", label: "Non-Vegetarian" },
  { value: "Vegan", label: "Strict Vegan" },
  { value: "Jain", label: "Jain (No Root Vegetables / Onion / Garlic)" },
];

/**
 * ==============================================================================
 * PreferencesSection Component
 * ==============================================================================
 * Handles:
 * 1. Notifications toggle (schedule alerts)
 * 2. Dietary preferences (catered by trip hotels)
 * 3. Formal Data Privacy & Emergency Consent Agreement
 */
export default function PreferencesSection({ formData, errors, onChange }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-inner">
          <Utensils size={18} />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-emerald-950">Preferences & Trip Consent</h3>
          <p className="text-xs text-gray-500">Meal requirements, alert preferences, and data consent</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Dietary Preference */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Dietary Preference (For Hotel Meals)
          </label>
          <select
            value={formData.dietary_preference}
            onChange={(e) => onChange("dietary_preference", e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            {DIETARY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-gray-400">
            Communicated to hotel kitchen staff for breakfast & dinner planning.
          </p>
        </div>

        {/* SMS & Push Alerts Toggle */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 flex items-center justify-between">
          <div className="pr-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
              <Bell size={14} className="text-emerald-600" />
              <span>SMS & Push Notifications</span>
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Receive departure time changes and urgent tour notices immediately.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={formData.notifications_enabled}
              onChange={(e) => onChange("notifications_enabled", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Mandatory Consent Block */}
      <div className={`rounded-2xl border p-4 sm:p-5 transition ${
        errors.consent_given ? "border-red-300 bg-red-50/30" : "border-emerald-200 bg-emerald-50/30"
      }`}>
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <input
              id="consent-checkbox"
              type="checkbox"
              checked={formData.consent_given}
              onChange={(e) => onChange("consent_given", e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-600 cursor-pointer mt-0.5"
            />
          </div>
          <div className="flex-1 text-xs">
            <label htmlFor="consent-checkbox" className="font-bold text-emerald-950 cursor-pointer flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-700" />
              <span>Trip Safety & Emergency Consent Agreement <span className="text-red-500">*</span></span>
            </label>
            <p className="text-gray-600 mt-1 leading-relaxed text-[11px]">
              I declare that the personal, emergency contact, and medical information provided above is accurate.
              I authorize the College Tour Coordinators, faculty mentors, and medical emergency staff to access and use
              this information strictly in the event of an emergency or health incident during the Industrial Visit.
              I understand this data is retained exclusively for trip duration and deleted following event completion.
            </p>

            {errors.consent_given && (
              <p className="mt-2 text-xs font-bold text-red-600">
                {errors.consent_given}
              </p>
            )}

            {formData.consent_given && (
              <p className="mt-2 text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                <Check size={13} strokeWidth={3} />
                <span>Consent given and recorded.</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
