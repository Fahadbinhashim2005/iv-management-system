import { Mail, IdCard, Camera, Lock, CheckCircle2 } from "lucide-react";
import Avatar from "../../components/Avatar";

/**
 * ==============================================================================
 * ProfileHeader Component
 * ==============================================================================
 * Displays the top student identity card:
 * - Interactive Avatar with overlay Camera edit trigger
 * - Student Full Name & Status Badge (from trip_assignments.status)
 * - Academic breadcrumb line
 * - Roll Number badge
 * - Locked Auth Email
 * - Profile Completeness indicator bar
 */
export default function ProfileHeader({
  profile,
  formData,
  tripAssignment,
  completeness,
  onOpenAvatarPicker,
}) {
  const studentName = formData.full_name || profile?.full_name || "Student";
  const studentDept = formData.department || "Computer Science & Engineering";
  const studentSem = formData.semester ? `Semester ${formData.semester}` : "Semester 5";
  const studentBatch = formData.batch ? `Batch ${formData.batch}` : "Batch 2023-27";
  const studentRoll = formData.roll_no || profile?.roll_no || "CS-2026-Pending";
  const studentEmail = profile?.email || "student@college.edu";
  const statusBadge = tripAssignment?.status || "Active Student";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar with Camera Trigger Overlay */}
        <div className="relative group shrink-0">
          <Avatar
            profile={{
              ...profile,
              avatar_type: formData.avatar_type,
              avatar_url: formData.avatar_url,
              avatar_style: formData.avatar_style,
              avatar_seed: formData.avatar_seed,
              full_name: studentName,
            }}
            size="xl"
            animate={true}
          />
          <button
            type="button"
            onClick={onOpenAvatarPicker}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md ring-4 ring-white transition hover:bg-emerald-800 hover:scale-110 active:scale-95"
            title="Change Profile Picture or Avatar"
            aria-label="Change Profile Picture"
          >
            <Camera size={16} />
          </button>
        </div>

        {/* Identity Details */}
        <div className="text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h2 className="text-2xl font-extrabold text-emerald-950 tracking-tight">
              {studentName}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 size={13} className="text-emerald-700" />
              {statusBadge}
            </span>
          </div>

          <p className="text-xs font-medium text-gray-500 mt-1">
            {studentDept} • {studentSem} • {studentBatch}
          </p>

          <div className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-start gap-3.5 text-xs text-gray-600">
            <span className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 ring-1 ring-gray-200">
              <IdCard size={15} className="text-emerald-600" />
              <strong className="text-gray-700">Roll:</strong> {studentRoll}
            </span>

            <span className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 ring-1 ring-gray-200">
              <Mail size={15} className="text-emerald-600" />
              <span>{studentEmail}</span>
              <Lock size={12} className="text-gray-400 ml-0.5" title="Owned by authentication (read-only)" />
            </span>
          </div>

          {/* Profile Completeness Bar */}
          <div className="mt-4 max-w-md">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-gray-600">Profile Completeness</span>
              <span className="font-extrabold text-emerald-800">{completeness}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
