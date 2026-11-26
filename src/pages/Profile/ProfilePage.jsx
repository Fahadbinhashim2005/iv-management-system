import { useState, useEffect } from "react";
import { Loader2, Save, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useProfile } from "../../hooks/useProfile";
import ProfileHeader from "./ProfileHeader";
import AcademicSection from "./AcademicSection";
import EmergencySection from "./EmergencySection";
import PreferencesSection from "./PreferencesSection";
import AvatarPicker from "./AvatarPicker";

/**
 * ==============================================================================
 * ProfilePage Component ("My Profile & Consent")
 * ==============================================================================
 * Master container combining:
 * 1. ProfileHeader (Avatar + Identity + Completeness bar)
 * 2. AcademicSection (Editable department/semester/batch + Read-only logistics)
 * 3. EmergencySection (Editable emergency contacts & blood group + Faculty Mentor)
 * 4. PreferencesSection (Dietary meal preference + Consent agreement)
 * 5. Sticky Action Bar on Mobile / Desktop
 * 6. Avatar Picker Modal
 */
export default function ProfilePage() {
  const {
    profile,
    tripAssignment,
    formData,
    errors,
    loading,
    saving,
    isDirty,
    completeness,
    fetchError,
    handleFieldChange,
    saveProfile,
    updateAvatar,
    resetForm,
    reloadProfile,
  } = useProfile();

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  // Warn user if closing tab or navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-xl"></div>
        <div className="h-44 bg-white rounded-3xl p-6 ring-1 ring-gray-100"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="h-72 bg-white rounded-3xl p-6 ring-1 ring-gray-100"></div>
          <div className="h-72 bg-white rounded-3xl p-6 ring-1 ring-gray-100"></div>
        </div>
      </div>
    );
  }

  // Friendly Error State with Retry Button
  if (fetchError && !profile) {
    return (
      <div className="max-w-md mx-auto my-12 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100 space-y-4">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-lg font-extrabold text-gray-900">Unable to Load Profile</h3>
        <p className="text-xs text-gray-500">{fetchError}</p>
        <button
          type="button"
          onClick={reloadProfile}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const isStudent = String(profile?.role || "student").toLowerCase() === "student";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Page Title & Breadcrumb */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
          Account & Security
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
          {isStudent ? "My Profile & Consent" : "My Profile & Settings"}
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          {isStudent
            ? "Manage your personal information, emergency credentials, and travel consent for the upcoming Industrial Visit."
            : "Update your name, contact phone, department, gender (for room selection), and avatar."}
        </p>
      </div>

      {/* 1. Header Card (Avatar, Name, Roll No, Locked Email, Completeness) */}
      <ProfileHeader
        profile={profile}
        formData={formData}
        tripAssignment={tripAssignment}
        completeness={completeness}
        onOpenAvatarPicker={() => setAvatarPickerOpen(true)}
      />

      {/* 2. Academic / Identity Section & Locked Tour Logistics */}
      <AcademicSection
        role={profile?.role || "student"}
        formData={formData}
        tripAssignment={tripAssignment}
        errors={errors}
        onChange={handleFieldChange}
      />

      {/* 3 & 4. Student Emergency Contacts & Consent Sections */}
      {isStudent && (
        <>
          <EmergencySection
            formData={formData}
            tripAssignment={tripAssignment}
            errors={errors}
            onChange={handleFieldChange}
          />

          <PreferencesSection
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
          />
        </>
      )}

      {/* 5. Sticky Bottom Action Bar (Responsive Mobile & Desktop) */}
      <div className={`sticky bottom-4 z-30 rounded-2xl bg-white/95 backdrop-blur-md p-4 shadow-xl ring-1 ring-gray-200 transition-all duration-300 ${
        isDirty ? "translate-y-0 opacity-100" : "opacity-95"
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="text-xs font-bold text-emerald-950 flex items-center justify-center sm:justify-start gap-1.5">
              {isDirty ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>You have unsaved changes</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>All profile changes saved to database</span>
                </>
              )}
            </span>
            <p className="text-[11px] text-gray-500">
              Ensure emergency contact details and consent are up to date.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {isDirty && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition active:scale-95"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={saveProfile}
              disabled={!isDirty || saving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-800 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Profile & Consent</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 6. Avatar Picker Modal */}
      <AvatarPicker
        isOpen={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        currentProfile={formData}
        onSaveAvatar={updateAvatar}
        userId={profile?.id}
      />
    </div>
  );
}
