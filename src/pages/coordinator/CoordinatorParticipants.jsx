import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";
import { downloadCsvFile } from "../../lib/exportUtils";
import Avatar from "../../components/Avatar";
import {
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Phone,
  Ban,
  Users,
  GraduationCap,
  HeartPulse,
  Utensils,
  UserCheck,
  X,
  Loader2,
  Info,
} from "lucide-react";

export default function CoordinatorParticipants() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const loadStudents = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const res = await api.getApprovedStudents();
      setStudents(Array.isArray(res?.students) ? res.students : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load approved students.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStudents(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadStudents]);

  useEffect(() => {
    if (!selectedStudent) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setSelectedStudent(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedStudent]);

  const uniqueDepartments = Array.from(
    new Set(students.map((s) => s.department).filter(Boolean))
  );

  const isStudentRole = (s) => String(s.role || "student").toLowerCase() === "student";
  const isCoordinatorRole = (s) => String(s.role || "").toLowerCase() === "coordinator";

  const studentsOnly = students.filter(isStudentRole);
  const coordinatorsOnly = students.filter(isCoordinatorRole);

  const counts = {
    all: students.length,
    totalStudents: studentsOnly.length,
    activeStudents: studentsOnly.filter((s) => s.is_active !== false).length,
    boys: studentsOnly.filter((s) => (s.gender || "").toLowerCase() === "male").length,
    girls: studentsOnly.filter((s) => (s.gender || "").toLowerCase() === "female").length,
    coordinators: coordinatorsOnly.length,
    medicalNotes: students.filter(
      (s) => Boolean(s.medical_notes && s.medical_notes.trim())
    ).length,
  };

  const filtered = students.filter((s) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (s.full_name || "").toLowerCase().includes(q) ||
      (s.roll_no || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q) ||
      (s.guardian_name || "").toLowerCase().includes(q) ||
      (s.department || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (departmentFilter !== "all" && (s.department || "") !== departmentFilter) {
      return false;
    }

    if (genderFilter === "unset" && s.gender) return false;
    if (
      genderFilter !== "all" &&
      genderFilter !== "unset" &&
      (s.gender || "").toLowerCase() !== genderFilter
    ) {
      return false;
    }

    if (filterMode === "boys") {
      return isStudentRole(s) && (s.gender || "").toLowerCase() === "male";
    }
    if (filterMode === "girls") {
      return isStudentRole(s) && (s.gender || "").toLowerCase() === "female";
    }
    if (filterMode === "coordinators") {
      return isCoordinatorRole(s);
    }
    if (filterMode === "medicalNotes") {
      return Boolean(s.medical_notes && s.medical_notes.trim());
    }
    return true;
  });

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast("No students in current view to export.", { icon: "ℹ️" });
      return;
    }
    downloadCsvFile(
      `IV2026_Approved_Students_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Name",
        "Roll No",
        "Email",
        "Department",
        "Batch",
        "Semester",
        "Gender",
        "Account Status",
        "Student Phone",
        "Guardian Name",
        "Guardian Relation",
        "Emergency Phone",
        "Blood Group",
        "Dietary Preference",
        "Medical Notes",
      ],
      filtered.map((s) => [
        s.full_name || "Student",
        s.roll_no || "",
        s.email || "",
        s.department || "",
        s.batch || "",
        s.semester ?? "",
        s.gender || "Unset",
        s.is_active === false ? "Deactivated" : "Approved",
        s.phone || "",
        s.guardian_name || "",
        s.guardian_relation || "",
        s.emergency_phone || "",
        s.blood_group || "",
        s.dietary_preference || "",
        s.medical_notes || "",
      ])
    );
    toast.success(`Exported ${filtered.length} approved student(s) to CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Students List
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            List of students with academic, contact, guardian, and medical details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadStudents(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 shadow-xs transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-emerald-700" : "text-emerald-700"} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-xs transition hover:bg-emerald-100 active:scale-95"
          >
            <Download size={15} className="text-emerald-800" />
            <span>Export Students (CSV)</span>
          </button>
        </div>
      </div>


      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Students</span>
            <Users size={16} className="text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{counts.totalStudents}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{counts.activeStudents} active accounts</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Boys</span>
            <GraduationCap size={16} className="text-blue-700" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{counts.boys}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Approved male students</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Girls</span>
            <HeartPulse size={16} className="text-pink-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{counts.girls}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Approved female students</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Coordinators</span>
            <UserCheck size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{counts.coordinators}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Approved faculty leads</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, roll no, email, phone, or guardian..."
              aria-label="Search approved students"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-2xs"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter students by department"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 focus:border-emerald-600 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {uniqueDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            aria-label="Filter students by gender"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 focus:border-emerald-600 focus:outline-none"
          >
            <option value="all">All Genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="unset">Gender Unset</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All", count: counts.all },
            { id: "boys", label: "Boys", count: counts.boys },
            { id: "girls", label: "Girls", count: counts.girls },
            { id: "coordinators", label: "Coordinators", count: counts.coordinators },
            { id: "medicalNotes", label: "Has Medical Notes", count: counts.medicalNotes },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={filterMode === tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shrink-0 ${filterMode === tab.id
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Empty States */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-12 text-xs font-semibold text-gray-500 shadow-xs ring-1 ring-gray-100">
          <Loader2 size={18} className="animate-spin text-emerald-700" />
          <span>Syncing approved students...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-xs ring-1 ring-gray-100 space-y-2">
          <Users size={34} className="mx-auto text-emerald-600 opacity-60" />
          <h3 className="text-base font-bold text-gray-900">No Approved Students Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {students.length === 0
              ? "Once the Administrator approves student accounts, they will appear here automatically."
              : "No approved students match your current search or filter criteria."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (Screens < 768px) */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((s) => {
              const isActive = s.is_active !== false;

              return (
                <div
                  key={s.id}
                  className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar profile={s} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-extrabold text-sm text-emerald-950">
                            {s.full_name || "Student"}
                          </p>
                          {isCoordinatorRole(s) && (
                            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-900">
                              Coordinator
                            </span>
                          )}
                        </div>
                        <p className="truncate font-mono text-[11px] text-gray-500">
                          {s.roll_no || "No Roll"} • {s.batch || "--"}
                          {s.semester ? ` • Sem ${s.semester}` : ""}
                        </p>
                        <p className="truncate text-[11px] text-gray-400">{s.email}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}
                    >
                      {isActive ? <CheckCircle2 size={11} /> : <Ban size={11} />}
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-[11px] bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500 truncate">{s.department || "Department unset"}</span>
                      <span className="capitalize font-bold text-blue-800 shrink-0">
                        {s.gender || "Gender unset"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Student Phone:</span>
                      {s.phone ? (
                        <a
                          href={`tel:${s.phone.replace(/\s+/g, "")}`}
                          className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline"
                        >
                          <Phone size={11} />
                          {s.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500 truncate">
                        Guardian: <strong className="text-gray-800">{s.guardian_name || "Unset"}</strong>
                        {s.guardian_relation ? ` (${s.guardian_relation})` : ""}
                      </span>
                      {s.emergency_phone ? (
                        <a
                          href={`tel:${s.emergency_phone.replace(/\s+/g, "")}`}
                          className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline shrink-0"
                        >
                          <Phone size={11} />
                          {s.emergency_phone}
                        </a>
                      ) : (
                        <span className="text-amber-700 font-semibold shrink-0">No emergency phone</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">
                        Blood: {s.blood_group || "--"}
                      </span>
                      {s.dietary_preference && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-800">
                          {s.dietary_preference}
                        </span>
                      )}
                      {s.medical_notes && s.medical_notes.trim() && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 font-bold text-purple-800">
                          Medical Note
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedStudent(s)}
                      className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline"
                    >
                      <Info size={13} />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table (Screens >= 768px) */}
          <div className="hidden md:block overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-5 py-3.5">Academic Details</th>
                    <th className="px-5 py-3.5">Contact &amp; Gender</th>
                    <th className="px-5 py-3.5">Guardian &amp; Emergency</th>
                    <th className="px-5 py-3.5">Medical &amp; Dietary</th>
                    <th className="px-5 py-3.5 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => {
                    const isActive = s.is_active !== false;
                    const hasMedical = Boolean(s.medical_notes && s.medical_notes.trim());

                    return (
                      <tr key={s.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar profile={s} size="sm" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-emerald-950 text-sm">
                                  {s.full_name || "Student"}
                                </p>
                                {isCoordinatorRole(s) && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-900">
                                    Coordinator
                                  </span>
                                )}
                                {!isActive && (
                                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-[11px] text-gray-500">
                                {s.roll_no || "No Roll"}
                              </p>
                              <p className="text-[11px] text-gray-400">{s.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {s.department || "Unassigned"}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {s.batch || "Batch unset"}
                            {s.semester ? ` • Semester ${s.semester}` : ""}
                          </p>
                        </td>

                        <td className="px-5 py-4 space-y-1">
                          <div>
                            {s.phone ? (
                              <a
                                href={`tel:${s.phone.replace(/\s+/g, "")}`}
                                className="font-semibold text-emerald-800 hover:underline"
                              >
                                {s.phone}
                              </a>
                            ) : (
                              <span className="text-[11px] text-gray-400">No phone</span>
                            )}
                          </div>
                          <div>
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${s.gender ? "bg-blue-50 text-blue-800" : "bg-amber-100 text-amber-800"
                                }`}
                            >
                              {s.gender || "Gender unset"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {s.guardian_name || <span className="text-amber-700">Guardian unset</span>}
                            {s.guardian_relation ? (
                              <span className="text-[11px] font-normal text-gray-500">
                                {" "}({s.guardian_relation})
                              </span>
                            ) : null}
                          </p>
                          {s.emergency_phone ? (
                            <a
                              href={`tel:${s.emergency_phone.replace(/\s+/g, "")}`}
                              className="text-[11px] font-semibold text-emerald-800 hover:underline"
                            >
                              {s.emergency_phone}
                            </a>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-700">
                              No emergency phone
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                              {s.blood_group || "Blood --"}
                            </span>
                            {s.dietary_preference && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                <Utensils size={10} />
                                {s.dietary_preference}
                              </span>
                            )}
                          </div>
                          {hasMedical && (
                            <p className="mt-1 max-w-[200px] truncate text-[11px] text-purple-800 font-medium" title={s.medical_notes}>
                              Note: {s.medical_notes}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50 transition"
                          >
                            <Info size={13} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Student Profile Detail Modal */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${selectedStudent.full_name || "Student"}`}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar profile={selectedStudent} size="md" />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-extrabold text-emerald-950">
                    {selectedStudent.full_name || "Student"}
                  </h3>
                  <p className="truncate font-mono text-xs text-gray-500">
                    {selectedStudent.roll_no || "No Roll No"} • {selectedStudent.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close student details"
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-gray-50 p-3.5 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Academic</p>
                <p className="font-bold text-emerald-950">{selectedStudent.department || "Unassigned"}</p>
                <p className="text-gray-600">
                  {selectedStudent.batch || "Batch unset"}
                  {selectedStudent.semester ? ` • Sem ${selectedStudent.semester}` : ""}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-3.5 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Identity &amp; Contact</p>
                <p className="font-bold text-emerald-950 capitalize">
                  Gender: {selectedStudent.gender || "Unset"}
                </p>
                <p className="text-gray-600">Phone: {selectedStudent.phone || "Not provided"}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-3.5 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Guardian &amp; Emergency</p>
                <p className="font-bold text-emerald-950">
                  {selectedStudent.guardian_name || "Not provided"}
                  {selectedStudent.guardian_relation ? ` (${selectedStudent.guardian_relation})` : ""}
                </p>
                <p className="text-gray-600">
                  Emergency: {selectedStudent.emergency_phone || "Not provided"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-3.5 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Medical &amp; Dietary</p>
                <p className="font-bold text-red-700">
                  Blood Group: {selectedStudent.blood_group || "--"}
                </p>
                <p className="text-gray-600">
                  Diet: {selectedStudent.dietary_preference || "Not specified"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 text-xs space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Medical Notes</p>
              <p className="text-gray-700 leading-relaxed">
                {selectedStudent.medical_notes?.trim() || "No medical notes or allergies reported."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs">
              <span className="text-gray-500">
                Consent:{" "}
                <strong className={selectedStudent.consent_given ? "text-emerald-700" : "text-amber-700"}>
                  {selectedStudent.consent_given
                    ? selectedStudent.consent_at
                      ? `Signed (${new Date(selectedStudent.consent_at).toLocaleDateString()})`
                      : "Signed"
                    : "Pending"}
                </strong>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {selectedStudent.phone && (
                  <a
                    href={`tel:${selectedStudent.phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 font-bold text-emerald-800 hover:bg-emerald-50"
                  >
                    <Phone size={13} />
                    <span>Call Student</span>
                  </a>
                )}
                {selectedStudent.emergency_phone && (
                  <a
                    href={`tel:${selectedStudent.emergency_phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2 font-bold text-white hover:bg-emerald-900"
                  >
                    <Phone size={13} />
                    <span>Call Guardian</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
