import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  MapPin, 
  Calendar, 
  Users, 
  Building2, 
  X, 
  ArrowRight
} from "lucide-react";

export default function CoordinatorVisits() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");

  const [visits, setVisits] = useState([
    {
      id: "IV-2026-01",
      title: "Industrial Visit 2026 — GIFT City & Tech Infrastructure",
      department: "Computer Science & Engineering",
      batch: "Batch 2023-27 (Semester 5)",
      host: "Gujarat International Finance Tec-City (GIFT) & ISRO SAC",
      location: "Gandhinagar & Ahmedabad, Gujarat",
      startDate: "2026-12-05",
      endDate: "2026-12-08",
      capacity: 135,
      enrolled: 128,
      status: "Published",
      facultyInCharge: "Dr. Rajesh Kumar (HOD) & Prof. Anjali Menon",
      objectives: "FinTech architectures, cloud server datacenters, automated green infrastructure, and aerospace satellite telemetry.",
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
      facultyInCharge: "Prof. Vikram Mohan",
      objectives: "Software engineering delivery pipelines, corporate datacenter management, and aerospace simulation.",
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
      facultyInCharge: "Dr. Rajesh Kumar",
      objectives: "AI incubators, cloud computing hubs, and startup innovation strategies.",
    },
  ]);

  // Form state for creating a new visit
  const [newVisit, setNewVisit] = useState({
    title: "",
    department: "Computer Science & Engineering",
    batch: "Batch 2023-27 (Semester 5)",
    host: "",
    location: "",
    startDate: "",
    endDate: "",
    capacity: 120,
    facultyInCharge: "Dr. Rajesh Kumar",
    objectives: "",
    emergencyContact: "+91 94471 23456",
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const created = {
      id: `IV-2027-0${visits.length + 1}`,
      ...newVisit,
      enrolled: 0,
      status: "Published",
    };
    setVisits([created, ...visits]);
    setShowCreateModal(false);
  };

  const filteredVisits = filterStatus === "All" 
    ? visits 
    : visits.filter((v) => v.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Visit Master Records</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Industrial Visit Programs
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Create, publish, and manage multi-day educational visits and participant quotas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Industrial Visit</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {["All", "Published", "Draft", "Completed"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filterStatus === status
                ? "bg-emerald-800 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Visits List */}
      <div className="space-y-4">
        {filteredVisits.map((visit) => (
          <div
            key={visit.id}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md sm:p-7"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      visit.status === "Published"
                        ? "bg-emerald-100 text-emerald-900"
                        : visit.status === "Draft"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {visit.status}
                  </span>
                  <span className="text-xs font-mono font-semibold text-gray-400">
                    {visit.id}
                  </span>
                  <span className="text-xs text-gray-500">• {visit.batch}</span>
                </div>

                <h2 className="mt-2 text-lg font-bold text-emerald-950 sm:text-xl">
                  {visit.title}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Building2 size={14} className="text-emerald-700" />
                    {visit.host}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={14} className="text-emerald-700" />
                    {visit.location}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-900">
                    <Calendar size={14} />
                    {visit.startDate} to {visit.endDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  type="button"
                  onClick={() => navigate("/coordinator/itinerary")}
                  className="rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  Itinerary
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/coordinator/participants")}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  Roster
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-gray-600 bg-gray-50/70 p-3 rounded-xl">
              <span className="font-bold text-emerald-950">Learning Objectives: </span>
              {visit.objectives}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <Users size={16} className="text-emerald-700" />
                <span>
                  Quota: <strong className="text-emerald-950">{visit.enrolled}</strong> / {visit.capacity} registered
                </span>
                <span className="text-gray-300">|</span>
                <span>Faculty: {visit.facultyInCharge}</span>
              </div>

              <button
                type="button"
                onClick={() => navigate("/coordinator/dashboard")}
                className="flex items-center gap-1 font-bold text-emerald-800 hover:underline"
              >
                <span>View Dashboard</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create New Visit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-emerald-950">
                  Create New Industrial Visit
                </h3>
                <p className="text-xs text-gray-500">
                  Provide visit details, target batch, dates, and learning objectives.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">Visit Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune Automotive & IT Innovation Tour 2027"
                  value={newVisit.title}
                  onChange={(e) => setNewVisit({ ...newVisit, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Target Department</label>
                  <input
                    type="text"
                    required
                    value={newVisit.department}
                    onChange={(e) => setNewVisit({ ...newVisit, department: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">Batch / Class</label>
                  <input
                    type="text"
                    required
                    value={newVisit.batch}
                    onChange={(e) => setNewVisit({ ...newVisit, batch: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Host Companies / Sites</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Motors Plant & Infosys Pune"
                    value={newVisit.host}
                    onChange={(e) => setNewVisit({ ...newVisit, host: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">Destination Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune, Maharashtra"
                    value={newVisit.location}
                    onChange={(e) => setNewVisit({ ...newVisit, location: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newVisit.startDate}
                    onChange={(e) => setNewVisit({ ...newVisit, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={newVisit.endDate}
                    onChange={(e) => setNewVisit({ ...newVisit, endDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">Participant Quota</label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="300"
                    value={newVisit.capacity}
                    onChange={(e) => setNewVisit({ ...newVisit, capacity: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Learning Objectives & Instructions</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Summarize key industry skills, technical focus areas, and compliance guidelines..."
                  value={newVisit.objectives}
                  onChange={(e) => setNewVisit({ ...newVisit, objectives: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900"
                >
                  Publish Industrial Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
