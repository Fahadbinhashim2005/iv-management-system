/**
 * ==============================================================================
 * IV Connect — Student Profile Validation Rules
 * ==============================================================================
 * Why this file exists:
 * Putting all validation rules in one pure JavaScript module keeps our UI
 * components clean and makes our code easy to read, test, and reuse.
 *
 * Each validator function returns an error string (e.g. "Name is required")
 * or null if the value is completely valid.
 */

// Helper to sanitize and normalize phone numbers (e.g. "+91 98765 43210" -> "+919876543210")
export function normalizePhoneNumber(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  // If user entered 10 digits without country code, prefix with +91
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  return cleaned;
}

/**
 * Validates a single field by name and value
 * @param {string} field - Field key (e.g. 'full_name', 'phone')
 * @param {any} value - Field value
 * @param {object} allValues - Full form state (for cross-field validation)
 * @returns {string|null} - Error message or null if valid
 */
export function validateField(field, value, allValues = {}) {
  switch (field) {
    case "full_name": {
      const trimmed = (value || "").trim();
      if (!trimmed) return "Full name is required.";
      if (trimmed.length < 2) return "Full name must be at least 2 characters.";
      if (trimmed.length > 80) return "Full name cannot exceed 80 characters.";
      return null;
    }

    case "roll_no": {
      const trimmed = (value || "").trim();
      if (!trimmed) return "Roll number is required.";
      if (trimmed.length < 3 || trimmed.length > 20) {
        return "Roll number must be between 3 and 20 characters.";
      }
      // Allows uppercase letters, digits, and hyphens/slashes
      if (!/^[A-Za-z0-9\-_/]+$/.test(trimmed)) {
        return "Roll number can only contain alphanumeric characters, hyphens, and slashes.";
      }
      return null;
    }

    case "phone": {
      const trimmed = (value || "").trim();
      if (!trimmed) return "Contact phone number is required.";
      const digits = trimmed.replace(/\D/g, "");
      // Indian mobile numbers typically have 10 digits (or 12 with country code 91)
      if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith("91"))) {
        return "Please enter a valid 10-digit mobile number.";
      }
      return null;
    }

    case "department": {
      if (!value) return "Please select your department.";
      return null;
    }

    case "gender": {
      if (value && !["male", "female", "other"].includes(String(value).toLowerCase())) {
        return "Please select a valid gender option.";
      }
      return null;
    }

    case "semester": {
      const sem = Number(value);
      if (!value || isNaN(sem) || sem < 1 || sem > 8) {
        return "Please select a valid semester (1 to 8).";
      }
      return null;
    }

    case "batch": {
      const trimmed = (value || "").trim();
      if (!trimmed) return "Academic batch is required.";
      return null;
    }

    case "guardian_name": {
      const trimmed = (value || "").trim();
      if (!trimmed) return "Guardian / parent name is required.";
      if (trimmed.length < 2 || trimmed.length > 80) {
        return "Guardian name must be between 2 and 80 characters.";
      }
      return null;
    }

    case "emergency_phone": {
      const trimmed = (value || "").trim();
      if (!trimmed) return "Emergency phone number is required.";
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith("91"))) {
        return "Please enter a valid 10-digit emergency phone number.";
      }
      return null;
    }

    case "blood_group": {
      const validGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
      if (!value || !validGroups.includes(value)) {
        return "Please select a valid blood group for emergency safety.";
      }
      return null;
    }

    case "medical_notes": {
      if (value && value.length > 500) {
        return "Medical notes cannot exceed 500 characters.";
      }
      return null;
    }

    case "consent_given": {
      // Consent is mandatory if emergency details or medical notes are entered
      if (!value) {
        return "Consent is required to store emergency and medical details.";
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Validates the complete student profile form.
 * Returns an object of errors: { [fieldName]: errorMessage }
 * If the object is empty, the entire form is valid.
 */
export function validateProfileForm(formData) {
  const errors = {};

  const requiredFields = [
    "full_name",
    "roll_no",
    "phone",
    "department",
    "semester",
    "batch",
    "guardian_name",
    "emergency_phone",
    "blood_group",
    "consent_given",
  ];

  requiredFields.forEach((field) => {
    const error = validateField(field, formData[field], formData);
    if (error) {
      errors[field] = error;
    }
  });

  // Optional fields that have constraint checks
  if (formData.medical_notes) {
    const medError = validateField("medical_notes", formData.medical_notes, formData);
    if (medError) errors.medical_notes = medError;
  }

  // Cross-field check: Emergency phone should ideally not be identical to student's phone
  const studentDigits = (formData.phone || "").replace(/\D/g, "").slice(-10);
  const emergencyDigits = (formData.emergency_phone || "").replace(/\D/g, "").slice(-10);
  if (studentDigits && emergencyDigits && studentDigits === emergencyDigits) {
    // Non-blocking warning attached to emergency_phone_warning
    errors.emergency_phone_warning =
      "Note: Emergency phone is identical to your personal number. Providing a guardian's number is recommended.";
  }

  return errors;
}

/**
 * Calculates student profile completeness percentage (0 - 100%)
 */
export function calculateProfileCompleteness(profile) {
  if (!profile) return 0;

  const coreFields = [
    "full_name",
    "roll_no",
    "gender",
    "phone",
    "department",
    "semester",
    "batch",
    "guardian_name",
    "emergency_phone",
    "blood_group",
    "consent_given",
  ];

  let completedCount = 0;
  coreFields.forEach((field) => {
    const val = profile[field];
    if (val !== null && val !== undefined && val !== "" && val !== false) {
      completedCount++;
    }
  });

  return Math.round((completedCount / coreFields.length) * 100);
}
