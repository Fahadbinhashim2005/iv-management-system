import { useState } from "react";
import { 
  Search, 
  Phone, 
  Mail, 
  Plus
} from "lucide-react";

export default function AdminCoordinators() {
  const [searchTerm, setSearchTerm] = useState("");

  const [coordinators] = useState([
    {
      id: "FAC-01",
      name: "Dr. Rajesh Kumar",
      designation: "Professor & Head of Department",
      department: "Computer Science & Engineering",
      assignedRole: "Lead Tour Commander",
      assignedTour: "IV-2026-01 (Ahmedabad & GIFT City)",
      phone: "+91 94471 23456",
      email: "rajesh.cs@college.edu",
      status: "Active Lead",
      badge: "Lead Commander",
    },
    {
      id: "FAC-02",
      name: "Prof. Anjali Menon",
      designation: "Associate Professor",
      department: "Computer Science & Engineering",
      assignedRole: "Logistics & Accommodation Head",
      assignedTour: "IV-2026-01 (Ahmedabad & GIFT City)",
      phone: "+91 98123 45678",
      email: "anjali.menon@college.edu",
      status: "Active Lead",
      badge: "Logistics Lead",
    },
    {
      id: "FAC-03",
      name: "Prof. Vikram Mohan",
      designation: "Assistant Professor",
      department: "Computer Science & Engineering",
      assignedRole: "Safety & Medical Protocol Officer",
      assignedTour: "IV-2026-02 (Bangalore Tech Park)",
      phone: "+91 94460 11223",
      email: "vikram.m@college.edu",
      status: "Assigned",
      badge: "Medical Officer",
    },
    {
      id: "FAC-04",
      name: "Prof. Deepa Nair",
      designation: "Assistant Professor",
      department: "Electronics & Communication",
      assignedRole: "Bus Escort & Attendance Auditor",
      assignedTour: "IV-2026-01 (Bus 01 Escort)",
      phone: "+91 98470 55667",
      email: "deepa.nair@college.edu",
      status: "Assigned",
      badge: "Bus Escort",
    },
  ]);

  const filtered = coordinators.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.assignedRole.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Faculty Governance</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Faculty Tour Officers & Leads
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Assign field commanders, safety escorts, and logistics leads across all industrial visits.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Faculty assignment dialog: Select professor and assign delegation role.")}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-900 active:scale-95 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Appoint Tour Officer</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by faculty name or assigned tour role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-sm"
        />
      </div>

      {/* Coordinators Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((faculty) => (
          <div
            key={faculty.id}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 font-bold text-emerald-800 text-sm shadow-sm">
                  {faculty.name.split(" ")[1]?.[0] || faculty.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-base">{faculty.name}</h3>
                  <p className="text-xs text-gray-500">{faculty.designation}</p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-900">
                {faculty.badge}
              </span>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold">Assigned Tour:</span>
                <span className="font-bold text-emerald-950">{faculty.assignedTour}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold">Field Role:</span>
                <span className="font-bold text-gray-800">{faculty.assignedRole}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs text-gray-600">
              <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                <Phone size={13} className="text-emerald-700" />
                {faculty.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail size={13} className="text-emerald-700" />
                {faculty.email}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
