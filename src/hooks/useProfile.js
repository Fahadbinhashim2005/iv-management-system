import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  validateProfileForm,
  validateField,
  calculateProfileCompleteness,
  normalizePhoneNumber
} from "../lib/profileValidation";
import toast from "react-hot-toast";

/**
 * ==============================================================================
 * Custom Hook: useProfile
 * ==============================================================================
 * Why custom hooks exist in React:
 * A custom hook bundles data fetching, form state management, validation,
 * and saving logic into a reusable function, keeping our UI components focused
 * solely on rendering.
 */
export function useProfile() {
  const { user, profile: authProfile, refreshProfile } = useAuth();

  // State: Profile Data from Database
  const [profile, setProfile] = useState(null);
  const [tripAssignment, setTripAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // State: Form Editable Values
  const [formData, setFormData] = useState({
    full_name: "",
    coordinator_type: "faculty",
    roll_no: "",
    gender: "",
    phone: "",
    department: "Computer Science & Engineering",
    semester: 5,
    batch: "2023-27",
    guardian_name: "",
    guardian_relation: "Father",
    emergency_phone: "",
    blood_group: "",
    medical_notes: "",
    dietary_preference: "Veg",
    notifications_enabled: true,
    consent_given: false,
    avatar_type: "initial",
    avatar_url: null,
    avatar_style: "lorelei",
    avatar_seed: "",
  });

  // State: Baseline copy to calculate "isDirty" (whether user made edits)
  const [initialData, setInitialData] = useState(null);

  // State: Validation Errors per field { [field]: errorMessage }
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /**
   * 1. Load Profile & Trip Assignments from Supabase
   */
  const loadProfileData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setFetchError(null);

      let loadedProfile = null;
      let loadedAssignment = null;

      // 1. Direct Supabase Query
      if (isSupabaseConfigured && supabase) {
        // Query profiles
        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (pErr) throw pErr;
        loadedProfile = pData;

        // Query trip_assignments (read-only logistical data)
        const { data: tData, error: tErr } = await supabase
          .from("trip_assignments")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!tErr) loadedAssignment = tData;
      }

      // 2. Fallback to authProfile or LocalStorage for offline resilience
      if (!loadedProfile) {
        const localSaved = localStorage.getItem(`iv_profile_${user.id}`);
        if (localSaved) {
          loadedProfile = JSON.parse(localSaved);
        } else {
          loadedProfile = {
            id: user.id,
            email: user.email,
            full_name: authProfile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "",
            role: "student",
            department: "Computer Science & Engineering",
            semester: 5,
            batch: "2023-27",
            roll_no: `CS-2026-${user.id.slice(0, 4).toUpperCase()}`,
            phone: "",
            guardian_name: "",
            guardian_relation: "Father",
            emergency_phone: "",
            blood_group: "O+",
            medical_notes: "",
            dietary_preference: "Veg",
            notifications_enabled: true,
            consent_given: false,
            avatar_type: "initial",
          };
        }
      }

      // 3. Do not fabricate trip_assignments when no DB row exists
      // (UI renders honest "Not assigned yet" state)

      // Hydrate state
      setProfile(loadedProfile);
      setTripAssignment(loadedAssignment);

      const storedCoordType = user?.id
        ? localStorage.getItem(`iv_coord_type_${user.id}`)
        : null;
      const resolvedCoordType =
        loadedProfile.coordinator_type ||
        user?.user_metadata?.coordinator_type ||
        storedCoordType ||
        "faculty";

      const formValues = {
        full_name: loadedProfile.full_name || "",
        coordinator_type: resolvedCoordType,
        roll_no: loadedProfile.roll_no || "",
        gender: loadedProfile.gender || "",
        phone: loadedProfile.phone || "",
        department: loadedProfile.department || "Computer Science & Engineering",
        semester: loadedProfile.semester || 5,
        batch: loadedProfile.batch || "2023-27",
        guardian_name: loadedProfile.guardian_name || "",
        guardian_relation: loadedProfile.guardian_relation || "Father",
        emergency_phone: loadedProfile.emergency_phone || "",
        blood_group: loadedProfile.blood_group || "",
        medical_notes: loadedProfile.medical_notes || "",
        dietary_preference: loadedProfile.dietary_preference || "Veg",
        notifications_enabled: loadedProfile.notifications_enabled !== false,
        consent_given: Boolean(loadedProfile.consent_given),
        avatar_type: loadedProfile.avatar_type || "initial",
        avatar_url: loadedProfile.avatar_url || null,
        avatar_style: loadedProfile.avatar_style || "lorelei",
        avatar_seed: loadedProfile.avatar_seed || user.id,
      };

      setFormData(formValues);
      setInitialData(formValues);
      setErrors({});
    } catch (err) {
      console.error("[useProfile] Failed to load student profile:", err);
      setFetchError(err.message || "Failed to load profile. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  }, [user, authProfile]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadProfileData();
    }, 0);
    return () => clearTimeout(t);
  }, [loadProfileData]);

  /**
   * 2. Field Change Handler with on-the-fly single field validation
   */
  const handleFieldChange = useCallback((field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Clear or set inline error on blur / change
      const error = validateField(field, value);
      setErrors((prevErr) => ({
        ...prevErr,
        [field]: error,
      }));

      return updated;
    });
  }, []);

  /**
   * 3. Calculate whether form has unsaved changes (isDirty)
   */
  const isDirty = useMemo(() => {
    if (!initialData) return false;
    return Object.keys(formData).some((key) => formData[key] !== initialData[key]);
  }, [formData, initialData]);

  /**
   * 4. Calculate profile completeness percentage (0 to 100%)
   */
  const completeness = useMemo(() => {
  const userRole = profile?.role || authProfile?.role || "student";
  return calculateProfileCompleteness(formData, userRole);
}, [formData, profile?.role, authProfile?.role]);

/**
 * 5. Save Changes to Supabase
 */
const saveProfile = async () => {
  const userRole = profile?.role || authProfile?.role || "student";
  const validationErrors = validateProfileForm(formData, userRole);
  setErrors(validationErrors);

  // Block submission if any blocking validation errors exist
  const blockingKeys = Object.keys(validationErrors).filter(
    (k) => k !== "emergency_phone_warning"
  );
  if (blockingKeys.length > 0) {
    toast.error("Please resolve the highlighted errors before saving.", { id: "profile-error" });
    return false;
  }

  try {
    setSaving(true);

    const normalizedRole = String(userRole).toLowerCase();
    const isStudentLike =
      normalizedRole === "student" ||
      (normalizedRole === "coordinator" && formData.coordinator_type === "student");
    const updates = {
      full_name: formData.full_name.trim(),
      ...(normalizedRole === "coordinator"
        ? { coordinator_type: formData.coordinator_type || "faculty" }
        : {}),
      roll_no: isStudentLike ? formData.roll_no.trim() : formData.roll_no?.trim() || null,
      gender: formData.gender ? formData.gender.toLowerCase() : null,
      phone: normalizePhoneNumber(formData.phone),
      department: formData.department,
      semester: isStudentLike ? Number(formData.semester) : formData.semester ? Number(formData.semester) : null,
      batch: isStudentLike ? formData.batch.trim() : formData.batch?.trim() || null,
      guardian_name: formData.guardian_name?.trim() || null,
      guardian_relation: formData.guardian_relation || null,
      emergency_phone: formData.emergency_phone ? normalizePhoneNumber(formData.emergency_phone) : null,
      blood_group: formData.blood_group || null,
      medical_notes: formData.medical_notes ? formData.medical_notes.trim() : null,
      dietary_preference: formData.dietary_preference || null,
      notifications_enabled: formData.notifications_enabled,
      consent_given: formData.consent_given,
      consent_at: formData.consent_given ? (profile?.consent_at || new Date().toISOString()) : null,
      avatar_type: formData.avatar_type,
      avatar_url: formData.avatar_url,
      avatar_style: formData.avatar_style,
      avatar_seed: formData.avatar_seed,
      updated_at: new Date().toISOString(),
    };

    // A. Write to Supabase
    if (isSupabaseConfigured && supabase && user?.id) {
      let { error: updateErr } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      // Graceful fallback if coordinator_type SQL migration hasn't been applied yet
      if (updateErr && updates.coordinator_type && String(updateErr.message || "").includes("coordinator_type")) {
        const fallbackUpdates = { ...updates };
        delete fallbackUpdates.coordinator_type;
        const retry = await supabase
          .from("profiles")
          .update(fallbackUpdates)
          .eq("id", user.id);
        updateErr = retry.error;
      }

      if (updateErr) {
        throw new Error(updateErr.message || "Failed to save profile to Supabase.");
      }

      if (normalizedRole === "coordinator") {
        supabase.auth
          .updateUser({ data: { coordinator_type: formData.coordinator_type || "faculty" } })
          .catch(() => { });
      }
    }

    // B. Save copy to LocalStorage for offline resilience
    if (user?.id) {
      if (normalizedRole === "coordinator") {
        localStorage.setItem(`iv_coord_type_${user.id}`, formData.coordinator_type || "faculty");
      }
      localStorage.setItem(`iv_profile_${user.id}`, JSON.stringify({ ...profile, ...updates }));
    }

    // C. Update baseline state so isDirty becomes false
    setInitialData({ ...formData });
    setProfile((prev) => ({ ...prev, ...updates }));

    // D. Refresh AuthContext so sidebar and header reflect the new name/avatar immediately
    if (refreshProfile) {
      await refreshProfile();
    }

    toast.success("Profile & Consent details updated successfully!", { id: "profile-save" });
    return true;
  } catch (err) {
    console.error("[useProfile Save Error]:", err);
    toast.error(err.message || "Failed to save profile. Please try again.", { id: "profile-save-err" });
    return false;
  } finally {
    setSaving(false);
  }
};

/**
 * 6. Quick Avatar Update (saves immediately without having to click main Save)
 */
const updateAvatar = async ({ avatar_type, avatar_url, avatar_style, avatar_seed }) => {
  try {
    const avatarUpdates = {
      avatar_type,
      avatar_url: avatar_url || null,
      avatar_style: avatar_style || "lorelei",
      avatar_seed: avatar_seed || user?.id,
    };

    setFormData((prev) => ({ ...prev, ...avatarUpdates }));
    setInitialData((prev) => ({ ...prev, ...avatarUpdates }));

    if (isSupabaseConfigured && supabase && user?.id) {
      const { error: avatarErr } = await supabase
        .from("profiles")
        .update(avatarUpdates)
        .eq("id", user.id);
      if (avatarErr) throw new Error(avatarErr.message);
    }

    if (user?.id) {
      localStorage.setItem(
        `iv_profile_${user.id}`,
        JSON.stringify({ ...profile, ...avatarUpdates })
      );
    }

    if (refreshProfile) {
      await refreshProfile();
    }

    toast.success("Profile avatar updated!", { id: "avatar-update" });
    return true;
  } catch (err) {
    console.error("[useProfile updateAvatar Error]:", err);
    toast.error("Failed to save avatar choice.");
    return false;
  }
};

/**
 * 7. Revert / Cancel Changes
 */
const resetForm = () => {
  if (initialData) {
    setFormData({ ...initialData });
    setErrors({});
    toast("Reverted form to last saved values.", { icon: "↩️", id: "profile-reset" });
  }
};

return {
  profile,
  tripAssignment,
  formData,
  initialData,
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
  reloadProfile: loadProfileData,
};
}
