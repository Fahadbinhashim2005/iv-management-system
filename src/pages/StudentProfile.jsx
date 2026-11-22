import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mail, 
  IdCard, 
  GraduationCap, 
  Heart, 
  LogOut
} from "lucide-react";

export default function StudentProfile() {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-700">Account & Security</p>
        <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
          Student Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal information, emergency contact credentials, and preferences.
        </p>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-3xl font-extrabold text-white shadow-md">
            F
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-extrabold text-emerald-950">
                Fahad Bin Hashim
              </h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                Active Student
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              B.Tech in Computer Science and Engineering (2023 - 2027)
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <IdCard size={15} className="text-emerald-600" />
                Roll: CS-2026-084
              </span>
              <span className="flex items-center gap-1.5">
                <Mail size={15} className="text-emerald-600" />
                fahadbinhashim03@gmail.com
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Information Columns */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Academic Details */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="font-bold text-emerald-950 flex items-center gap-2">
            <GraduationCap size={18} className="text-emerald-600" />
            <span>Academic Information</span>
          </h3>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Department</span>
              <span className="font-semibold text-emerald-950">Computer Science & Eng.</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Semester</span>
              <span className="font-semibold text-emerald-950">Semester 5 (Batch A)</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Assigned Bus</span>
              <span className="font-semibold text-emerald-950">Bus #04 • Seat 14A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hotel Room</span>
              <span className="font-semibold text-emerald-950">Room #304 (Hotel Grand Ambience)</span>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="font-bold text-emerald-950 flex items-center gap-2">
            <Heart size={18} className="text-red-500" />
            <span>Emergency Contacts</span>
          </h3>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Guardian / Parent Name</span>
              <span className="font-semibold text-emerald-950">Mr. Hashim P.</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Emergency Phone</span>
              <span className="font-semibold text-emerald-950">+91 94471 23456</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Blood Group</span>
              <span className="font-semibold text-red-600">O+ (Positive)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Faculty Mentor</span>
              <span className="font-semibold text-emerald-950">Prof. Anjali Menon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences & Settings */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="font-bold text-emerald-950">Tour Preferences</h3>

        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-xs font-bold text-emerald-950">SMS & Push Notifications</p>
              <p className="text-[11px] text-gray-500">Receive schedule change alerts immediately</p>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={() => setNotificationsEnabled(!notificationsEnabled)}
              className="h-4 w-4 accent-emerald-600 cursor-pointer"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            {savedSuccess ? "Preferences Saved! ✓" : "Save Preferences"}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-red-50 px-5 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
