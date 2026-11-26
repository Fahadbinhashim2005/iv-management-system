import { useState, useEffect } from "react";
import { 
  Search, 
  Phone, 
  Mail, 
  Plus, 
  RotateCcw, 
  Ban, 
  CheckCircle2, 
  X, 
  KeyRound, 
  Copy, 
  Printer, 
  FileCheck, 
  Clock, 
  UserCheck, 
  UserX 
} from "lucide-react";
import { api } from "../../services/api";

function generateRandomPassword(length = 12) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

export default function AdminCoordinators() {
  const [activeTab, setActiveTab] = useState("requests"); // 'requests' | 'approved'
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedCoordinators, setApprovedCoordinators] = useState([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [credentialCard, setCredentialCard] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    gender: "",
    department: "Computer Science & Engineering",
    designation: "Assistant Professor",
    phone: "",
    password: generateRandomPassword(12),
  });

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [reqRes, usersRes] = await Promise.all([
        api.getAccessRequests("coordinator").catch(() => ({ requests: [] })),
        api.getAdminUsers("coordinator", "approved").catch(() => ({ users: [] })),
      ]);

      setPendingRequests(reqRes?.requests || []);
      setApprovedCoordinators(usersRes?.users || []);
    } catch (err) {
      console.warn("Failed to load coordinators data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // 1. One-click Approve Request
  const handleApproveRequest = async (req) => {
    try {
      await api.approveAccessRequest(req.id, req.email);
      showToast(`Approved coordinator ${req.full_name} (${req.email}). They can now log in!`);
      loadAllData();
    } catch (err) {
      alert(err.message || "Failed to approve request.");
    }
  };

  // 2. Reject Request
  const handleRejectRequest = async (req) => {
    if (!window.confirm(`Decline access request from ${req.full_name} (${req.email})?`)) return;
    try {
      await api.rejectAccessRequest(req.id, req.email);
      showToast(`Declined request from ${req.email}.`);
      loadAllData();
    } catch (err) {
      alert(err.message || "Failed to decline request.");
    }
  };

  // 3. Add Coordinator Manually
  const handleAddCoordinator = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.createAdminUser({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: "coordinator",
        gender: formData.gender || null,
        phone: formData.phone,
        details: {
          department: formData.department,
          designation: formData.designation,
        },
      });

      if (res?.user) {
        setCredentialCard({
          full_name: formData.full_name,
          email: formData.email,
          password: res.user.initial_password || formData.password,
          designation: formData.designation,
        });
        showToast(`Appointed approved coordinator: ${formData.full_name}`);
        setShowAddModal(false);
        setFormData({
          full_name: "",
          email: "",
          gender: "",
          department: "Computer Science & Engineering",
          designation: "Assistant Professor",
          phone: "",
          password: generateRandomPassword(12),
        });
        loadAllData();
      }
    } catch (err) {
      alert(err.message || "Failed to create coordinator account.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Toggle activation
  const handleToggleActive = async (coord) => {
    try {
      const newStatus = !coord.is_active;
      await api.updateAdminUser(coord.id, { is_active: newStatus });
      showToast(`${coord.full_name || coord.name} ${newStatus ? 'activated' : 'deactivated'}.`);
      loadAllData();
    } catch (err) {
      alert(err.message || "Failed to toggle status.");
    }
  };

  const handleGenderChange = async (coord, genderValue) => {
    try {
      const nextGender = genderValue || null;
      await api.updateAdminUser(coord.id, { gender: nextGender });
      setApprovedCoordinators((prev) =>
        prev.map((c) => (c.id === coord.id ? { ...c, gender: nextGender } : c))
      );
      showToast(`Updated gender for ${coord.full_name || coord.name}.`);
    } catch (err) {
      alert(err.message || "Failed to update gender.");
    }
  };

  // 5. Reset Password
  const handleResetPassword = async (coord) => {
    const tempPw = generateRandomPassword(12);
    if (!window.confirm(`Reset password for ${coord.full_name}?`)) return;

    try {
      const res = await api.resetUserPassword(coord.id, tempPw);
      setCredentialCard({
        full_name: coord.full_name,
        email: coord.email,
        password: res.temporary_password || tempPw,
        designation: coord.coordinator_details?.designation || "Tour Coordinator",
      });
      showToast(`Password reset for ${coord.full_name}`);
      loadAllData();
    } catch (err) {
      alert(err.message || "Failed to reset password.");
    }
  };

  const filteredRequests = pendingRequests.filter((r) => {
    const s = searchTerm.toLowerCase();
    return (r.full_name || "").toLowerCase().includes(s) || (r.email || "").toLowerCase().includes(s);
  });

  const filteredApproved = approvedCoordinators.filter((c) => {
    const s = searchTerm.toLowerCase();
    const name = c.full_name || c.name || "";
    const dept = c.coordinator_details?.department || c.department || "";
    return name.toLowerCase().includes(s) || dept.toLowerCase().includes(s) || (c.email || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-950 border border-amber-400 px-4 py-3 text-xs font-bold text-white shadow-2xl animate-fade-in">
          <FileCheck size={16} className="text-amber-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Faculty Governance & Security</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Coordinator Access & Directory
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Approve faculty coordinator sign-ins and manage tour operational officers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-900 active:scale-95 transition self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Appoint Coordinator</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === "requests"
              ? "border-emerald-700 text-emerald-950 font-black"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <span>Pending Requests</span>
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("approved")}
          className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === "approved"
              ? "border-emerald-700 text-emerald-950 font-black"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <span>Approved Coordinators ({approvedCoordinators.length})</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by faculty name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-xs"
        />
      </div>

      {/* TAB 1: PENDING COORDINATOR REQUESTS */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-xs border border-gray-100 space-y-2">
              <Clock size={36} className="mx-auto text-emerald-600 opacity-60" />
              <h3 className="font-bold text-gray-900 text-base">No Pending Coordinator Requests</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                When faculty sign in as a Coordinator for the first time, their approval request will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-3xl bg-white p-5 shadow-xs border border-gray-100 space-y-3 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-emerald-950 text-base">{req.full_name}</h4>
                      <p className="text-xs text-gray-500 font-mono">{req.email}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                      <Clock size={11} />
                      Pending Approval
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    Requested on: {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleApproveRequest(req)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-900 active:scale-95 transition"
                    >
                      <UserCheck size={14} />
                      <span>Approve Access</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRejectRequest(req)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 transition"
                    >
                      <UserX size={14} />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPROVED COORDINATORS DIRECTORY */}
      {activeTab === "approved" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredApproved.length === 0 ? (
            <div className="col-span-full rounded-3xl bg-white p-12 text-center text-gray-500 border border-gray-100">
              No approved coordinators yet.
            </div>
          ) : (
            filteredApproved.map((faculty) => {
              const name = faculty.full_name || faculty.name || "Faculty Coordinator";
              const designation = faculty.coordinator_details?.designation || faculty.designation || "Tour Coordinator";
              const dept = faculty.coordinator_details?.department || faculty.department || "Engineering";
              const isActive = faculty.is_active !== false;

              return (
                <div
                  key={faculty.id}
                  className="rounded-3xl bg-white p-6 shadow-xs ring-1 ring-gray-100 space-y-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 font-bold text-emerald-800 text-sm shadow-xs">
                        {name.split(" ")[1]?.[0] || name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-emerald-950 text-base">{name}</h3>
                        <p className="text-xs text-gray-500">{designation}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isActive ? "Active Lead" : "Deactivated"}
                    </span>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-semibold">Department:</span>
                      <span className="font-bold text-emerald-950">{dept}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-semibold">Gender:</span>
                      <select
                        value={faculty.gender || ""}
                        onChange={(e) => handleGenderChange(faculty, e.target.value)}
                        aria-label={`Gender for ${name}`}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-bold text-gray-800 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="">Unset</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                      <Phone size={13} className="text-emerald-700" />
                      {faculty.phone || "+91 94471 00000"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} className="text-emerald-700" />
                      {faculty.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 text-xs">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(faculty)}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-gray-600 hover:bg-gray-100 transition"
                    >
                      <RotateCcw size={12} />
                      <span>Reset Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(faculty)}
                      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 transition ${
                        isActive
                          ? "border-red-200 text-red-700 hover:bg-red-50"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {isActive ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                      <span>{isActive ? "Deactivate" : "Activate"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Credential Card Modal */}
      {credentialCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-emerald-800">
                <KeyRound size={22} className="text-amber-600" />
                <h3 className="font-black text-lg text-emerald-950">Coordinator Credentials</h3>
              </div>
              <button
                type="button"
                onClick={() => setCredentialCard(null)}
                className="rounded-full p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Officer:</span>
                <span className="font-bold text-gray-900">{credentialCard.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Email:</span>
                <span className="font-bold text-gray-900 select-all">{credentialCard.email}</span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span className="text-amber-900 font-sans font-bold">Password:</span>
                <span className="font-bold text-amber-950 text-sm select-all">{credentialCard.password}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `IV Connect Faculty Credentials\nOfficer: ${credentialCard.full_name}\nEmail: ${credentialCard.email}\nPassword: ${credentialCard.password}`
                  );
                  showToast("Copied to clipboard.");
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-900"
              >
                <Copy size={14} />
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Coordinator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-xl text-emerald-950">Appoint Approved Coordinator</h3>
                <p className="text-xs text-gray-500">Directly provision coordinator with immediate access.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCoordinator} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Faculty Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="faculty@college.edu"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="">Not specified</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generateRandomPassword(12) })}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-mono text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-emerald-800 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900"
                >
                  {loading ? "Appointing..." : "Save Coordinator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
