import { useState } from "react";
import { 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  Building2, 
  X, 
  FileCheck, 
  CheckCircle2
} from "lucide-react";

export default function AdminVisits() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [tours, setTours] = useState([
    {
      id: "IV-2026-01",
      title: "Industrial Visit 2026 — GIFT City & Tech Infrastructure",
      department: "Computer Science & Engineering",
      batch: "Batch 2023-27 (Semester 5)",
      host: "Gujarat International Finance Tec-City (GIFT) & ISRO SAC",
      location: "Ahmedabad, Gujarat",
      startDate: "2026-12-05",
      endDate: "2026-12-08",
      capacity: 135,
      enrolled: 128,
      status: "Published",
      leadCoordinator: "Dr. Rajesh Kumar (HOD CS)",
      budget: "₹5,40,000",
      complianceCleared: true,
    },
    {
      id: "IV-2026-02",
      title: "Bangalore Tech Park & Aerospace Hub Study Tour",
      department: "Computer Science & Engineering",
      batch: "Batch 2024-28 (Semester 3)",
      host: "Infosys Mysore Campus & HAL Aerospace Heritage Centre",
      location: "Bengaluru & Mysuru, Karnataka",
      startDate: "2027-02-12",
      endDate: "2027-02-16",
      capacity: 120,
      enrolled: 84,
      status: "Draft",
      leadCoordinator: "Prof. Vikram Mohan",
      budget: "₹4,20,000",
      complianceCleared: false,
    },
    {
      id: "IV-2025-01",
      title: "Hyderabad Cyberabad & T-Hub Innovation Tour",
      department: "Computer Science & Engineering",
      batch: "Batch 2022-26 (Semester 7)",
      host: "T-Hub Innovation Ecosystem & Microsoft Campus",
      location: "Hyderabad, Telangana",
      startDate: "2025-11-18",
      endDate: "2025-11-21",
      capacity: 110,
      enrolled: 110,
      status: "Completed",
      leadCoordinator: "Dr. Rajesh Kumar",
      budget: "₹3,90,000",
      complianceCleared: true,
    },
  ]);

  const [form, setForm] = useState({
    title: "",
    department: "Computer Science & Engineering",
    batch: "Batch 2023-27",
    host: "",
    location: "",
    startDate: "",
    endDate: "",
    capacity: 120,
    budget: "₹4,50,000",
    leadCoordinator: "Dr. Rajesh Kumar",
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const created = {
      id: `IV-2027-0${tours.length + 1}`,
      ...form,
      enrolled: 0,
      status: "Published",
      complianceCleared: true,
    };
    setTours([created, ...tours]);
    setShowCreateModal(false);
    setToastMsg(`Master Tour ${created.title} created and authorized.`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const toggleStatus = (id, newStatus) => {
    setTours((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    setToastMsg(`Tour ${id} status updated to ${newStatus}.`);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const filtered = tours.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-950 border border-amber-400 px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <FileCheck size={16} className="text-amber-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Master Institutional Registry</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Tour Master Programs
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Institutional authorization, budget approvals, and lead coordinator assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-900 px-5 py-3 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-emerald-800 active:scale-95 self-start sm:self-auto"
        >
          <Plus size={16} className="text-amber-300" />
          <span>Create New Master Program</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by tour title or destination..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-sm"
        />
      </div>

      {/* Tours Grid */}
      <div className="space-y-4">
        {filtered.map((tour) => (
          <div
            key={tour.id}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md sm:p-7 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                      tour.status === "Published"
                        ? "bg-emerald-100 text-emerald-900"
                        : tour.status === "Draft"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {tour.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-400">{tour.id}</span>
                  <span className="text-xs text-gray-500">• {tour.department}</span>
                </div>

                <h2 className="mt-2 text-lg font-bold text-emerald-950 sm:text-xl">
                  {tour.title}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Building2 size={14} className="text-emerald-700" />
                    {tour.host}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={14} className="text-emerald-700" />
                    {tour.location}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-emerald-950">
                    <Calendar size={14} />
                    {tour.startDate} to {tour.endDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {tour.status === "Draft" ? (
                  <button
                    type="button"
                    onClick={() => toggleStatus(tour.id, "Published")}
                    className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-900"
                  >
                    Authorize & Publish
                  </button>
                ) : tour.status === "Published" ? (
                  <button
                    type="button"
                    onClick={() => toggleStatus(tour.id, "Draft")}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Hold / Suspend
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-gray-100 pt-4 text-xs">
              <div className="rounded-xl bg-gray-50 p-2.5">
                <span className="text-gray-400 font-semibold uppercase text-[10px]">Lead Coordinator</span>
                <p className="mt-0.5 font-bold text-emerald-950">{tour.leadCoordinator}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-2.5">
                <span className="text-gray-400 font-semibold uppercase text-[10px]">Sanctioned Budget</span>
                <p className="mt-0.5 font-bold text-emerald-950">{tour.budget}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-2.5">
                <span className="text-gray-400 font-semibold uppercase text-[10px]">Quota & Enrollment</span>
                <p className="mt-0.5 font-bold text-emerald-950">
                  {tour.enrolled} / {tour.capacity} Students
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-2.5">
                <span className="text-gray-400 font-semibold uppercase text-[10px]">Statutory Permit</span>
                <p className="mt-0.5 font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  {tour.complianceCleared ? "Legally Cleared" : "Pending Signature"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base">Create Master Tour Program</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700">Tour Program Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune Cyber Infrastructure & Automotive Tour 2027"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700">Host Institutions</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Motors & CDAC"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune, MH"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Budget</label>
                  <input
                    type="text"
                    required
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-5 py-2 font-bold text-white shadow-sm hover:bg-emerald-900"
                >
                  Create & Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
