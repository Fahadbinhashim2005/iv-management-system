import { useState, useEffect, useId } from "react";
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  UserPlus, 
  Upload, 
  KeyRound, 
  Copy, 
  Printer, 
  Ban, 
  RotateCcw, 
  X, 
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
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

export default function AdminStudents() {
  const fileInputId = useId();
  const [activeTab, setActiveTab] = useState("requests"); // 'requests' | 'approved'
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Real Data State from Database
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [credentialCard, setCredentialCard] = useState(null);

  // Add Single Student Form
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    roll_no: "",
    department: "Computer Science & Engineering",
    batch: "Batch 2023-27",
    phone: "",
    password: generateRandomPassword(12),
  });
  const [showPw, setShowPw] = useState(false);

  // Bulk CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);

  // Load both pending requests and approved students
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [reqRes, usersRes] = await Promise.all([
        api.getAccessRequests("student").catch(() => ({ requests: [] })),
        api.getAdminUsers("student", "approved").catch(() => ({ users: [] })),
      ]);

      setPendingRequests(reqRes?.requests || []);
      setApprovedStudents(usersRes?.users || []);
    } catch (err) {
      console.warn("Failed to load student data:", err);
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
      showToast(`Approved ${req.full_name} (${req.email}). They can now sign in!`);
      loadAllData();
    } catch (err) {
      alert(err.message || "Failed to approve request.");
    }
  };

  // 2. Reject Request
  const handleRejectRequest = async (req) => {
    if (!window.confirm(`Decline access request from ${req.full_name} (${req.email})?`)) return;
    try {
      await api.rejectAccessRequest(req.id);
      showToast(`Declined request from ${req.email}.`);
      loadAllData();
    } catch (err) {
      alert(err.message || "Failed to decline request.");
    }
  };

  // 3. Add single student manually (pre-approved)
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.createAdminUser({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: "student",
        phone: formData.phone,
        details: {
          roll_no: formData.roll_no,
          department: formData.department,
          batch: formData.batch,
        },
      });

      if (res?.user) {
        setCredentialCard({
          full_name: formData.full_name,
          email: formData.email,
          password: res.user.initial_password || formData.password,
          roll_no: formData.roll_no,
        });
        showToast(`Provisioned approved account for ${formData.full_name}`);
        setShowAddModal(false);
        setFormData({
          full_name: "",
          email: "",
          roll_no: "",
          department: "Computer Science & Engineering",
          batch: "Batch 2023-27",
          phone: "",
          password: generateRandomPassword(12),
        });
        loadAllData();
      }
    } catch (err) {
      alert(err.message || "Failed to create student account.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Toggle activation for approved student
  const handleToggleActive = async (student) => {
    try {
      const newStatus = !student.is_active;
      await api.updateAdminUser(student.id, { is_active: newStatus });
      showToast(`Account for ${student.full_name} ${newStatus ? 'activated' : 'deactivated'}.`);
      loadAllData();
    } catch (err) {
      alert(err.message || "Failed to update account status.");
    }
  };

  // 5. Reset password
  const handleResetPassword = async (student) => {
    const tempPw = generateRandomPassword(12);
    if (!window.confirm(`Reset password for ${student.full_name}? A new temporary password will be generated.`)) return;

    try {
      const res = await api.resetUserPassword(student.id, tempPw);
      setCredentialCard({
        full_name: student.full_name,
        email: student.email,
        password: res.temporary_password || tempPw,
        roll_no: student.student_details?.roll_no || student.roll_number || "Student",
      });
      showToast(`Password reset for ${student.full_name}`);
      loadAllData();
    } catch (err) {
      alert(err.message || "Failed to reset password.");
    }
  };

  // CSV Parsing
  const handleCsvChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setBulkErrors([]);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setBulkErrors(["The uploaded CSV file is empty or missing headers."]);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]+/g, ''));
      const required = ["full_name", "email", "roll_no"];
      const missing = required.filter((r) => !headers.includes(r));

      if (missing.length > 0) {
        setBulkErrors([`Missing required headers: ${missing.join(", ")}. Expected: full_name, email, roll_no, department, batch, phone`]);
        return;
      }

      const parsed = [];
      const validationErrors = [];
      const seenEmails = new Set();

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (row.length < 3) continue;

        const rowObj = {};
        headers.forEach((h, index) => {
          rowObj[h] = row[index] || "";
        });

        if (!rowObj.email || !rowObj.full_name) {
          validationErrors.push(`Row ${i + 1}: Missing name or email.`);
        } else if (seenEmails.has(rowObj.email.toLowerCase())) {
          validationErrors.push(`Row ${i + 1}: Duplicate email (${rowObj.email}) in file.`);
        } else {
          seenEmails.add(rowObj.email.toLowerCase());
          rowObj.temporary_password = generateRandomPassword(12);
          parsed.push(rowObj);
        }
      }

      setParsedRows(parsed);
      setBulkErrors(validationErrors);
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (parsedRows.length === 0) return;
    try {
      setLoading(true);
      const res = await api.bulkCreateAdminUsers(parsedRows);
      setBulkResult(res);
      showToast(`Bulk provisioned: ${res.succeededCount} students added.`);
      loadAllData();
    } catch (err) {
      alert(err.message || "Bulk import failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBulkCredentials = () => {
    if (!bulkResult?.users || bulkResult.users.length === 0) return;
    const header = "full_name,email,roll_no,department,temporary_password\n";
    const rows = bulkResult.users
      .map((u) => `"${u.full_name}","${u.email}","${u.roll_no}","${u.department}","${u.temporary_password}"`)
      .join("\n");
    
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `student_credentials_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter
  const filteredRequests = pendingRequests.filter((r) => {
    const s = searchTerm.toLowerCase();
    return (r.full_name || "").toLowerCase().includes(s) || (r.email || "").toLowerCase().includes(s);
  });

  const filteredApproved = approvedStudents.filter((a) => {
    const s = searchTerm.toLowerCase();
    const roll = a.student_details?.roll_no || a.roll_number || "";
    return (a.full_name || "").toLowerCase().includes(s) || (a.email || "").toLowerCase().includes(s) || roll.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Student Identity & Authorization</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Student Access Approval Queue
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Review incoming student sign-in requests, authorize access, and manage student rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900 active:scale-95 transition"
          >
            <UserPlus size={15} />
            <span>Add Student</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-800 shadow-xs hover:bg-gray-50 active:scale-95 transition"
          >
            <Upload size={15} className="text-emerald-700" />
            <span>Bulk CSV</span>
          </button>
        </div>
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
          <span>Approved Students ({approvedStudents.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by student name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-xs"
        />
      </div>

      {/* TAB 1: PENDING REQUESTS QUEUE */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-xs border border-gray-100 space-y-2">
              <Clock size={36} className="mx-auto text-emerald-600 opacity-60" />
              <h3 className="font-bold text-gray-900 text-base">No Pending Student Requests</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                When a student signs in for the first time with their email and password, their request will appear here for your one-click approval.
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
                      <h4 className="font-black text-emerald-950 text-base">{req.full_name || req.email.split('@')[0]}</h4>
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
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 active:scale-95 transition"
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

      {/* TAB 2: APPROVED STUDENTS DIRECTORY */}
      {activeTab === "approved" && (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3.5">Student Details</th>
                  <th className="px-5 py-3.5">Contact / Department</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApproved.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-gray-500">
                      {loading ? "Loading..." : "No approved students in the database yet. Approve pending requests to populate."}
                    </td>
                  </tr>
                ) : (
                  filteredApproved.map((student) => {
                    const roll = student.student_details?.roll_no || student.roll_number || "CS-2026";
                    const dept = student.student_details?.department || student.department || "Computer Science";
                    const isActive = student.is_active !== false;

                    return (
                      <tr key={student.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-5 py-4">
                          <p className="font-bold text-emerald-950 text-sm">{student.full_name}</p>
                          <p className="font-mono text-[11px] text-gray-500">{roll}</p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-gray-900 font-medium">{student.email}</p>
                          <p className="text-[11px] text-gray-500">{dept}</p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {isActive ? <CheckCircle2 size={11} /> : <Ban size={11} />}
                            {isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleResetPassword(student)}
                              title="Reset Password"
                              className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-100 hover:text-emerald-800 transition"
                            >
                              <RotateCcw size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(student)}
                              title={isActive ? "Deactivate Account" : "Activate Account"}
                              className={`rounded-lg border p-1.5 transition ${
                                isActive
                                  ? "border-red-200 text-red-700 hover:bg-red-50"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {isActive ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credential Card Modal */}
      {credentialCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-emerald-800">
                <KeyRound size={22} className="text-amber-600" />
                <h3 className="font-black text-lg text-emerald-950">Student Credentials</h3>
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
                <span className="text-gray-500">Student:</span>
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
                    `IV Connect Student Credentials\nName: ${credentialCard.full_name}\nEmail: ${credentialCard.email}\nPassword: ${credentialCard.password}`
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

      {/* Manual Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-xl text-emerald-950">Add Approved Student</h3>
                <p className="text-xs text-gray-500">Directly add a student with instant approval.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roll_no}
                    onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                    placeholder="e.g. CS-2026-001"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@college.edu"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Initial Password *
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
                  {loading ? "Adding..." : "Add & Approve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-xl text-emerald-950">Bulk Student CSV Import</h3>
                <p className="text-xs text-gray-500">Upload a spreadsheet containing student roster data.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowBulkModal(false); setBulkResult(null); }}
                className="rounded-full p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center hover:border-emerald-600 transition">
              <input
                id={fileInputId}
                type="file"
                accept=".csv"
                onChange={handleCsvChange}
                className="hidden"
              />
              <label htmlFor={fileInputId} className="cursor-pointer space-y-2 block">
                <Upload size={32} className="mx-auto text-emerald-700" />
                <p className="text-xs font-bold text-gray-700">Click to choose CSV file</p>
                <p className="text-[11px] text-gray-400">full_name, email, roll_no, department, batch, phone</p>
              </label>
            </div>

            {bulkResult && (
              <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs space-y-2">
                <p className="font-bold text-emerald-900">Successfully imported {bulkResult.succeededCount} students.</p>
                <button
                  type="button"
                  onClick={handleDownloadBulkCredentials}
                  className="rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-900"
                >
                  Download Credentials CSV
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowBulkModal(false); setBulkResult(null); }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              {!bulkResult && (
                <button
                  type="button"
                  disabled={parsedRows.length === 0 || loading}
                  onClick={handleBulkSubmit}
                  className="flex-1 rounded-xl bg-emerald-800 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900 disabled:opacity-50"
                >
                  {loading ? "Importing..." : `Import ${parsedRows.length} Students`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
