import { useState } from "react";
import { 
  ScanLine, 
  CheckCircle2, 
  Search, 
  Camera, 
  AlertTriangle, 
  RefreshCw
} from "lucide-react";

export default function CoordinatorAttendance() {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState("Gate #2 Departure");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [attendees, setAttendees] = useState([
    { id: 1, name: "Fahad Bin Hashim", roll: "CS-2026-084", bus: "Bus 04", seat: "14A", status: "Present", time: "05:58 AM", method: "QR Pass Scan" },
    { id: 2, name: "Rohan Varma", roll: "CS-2026-091", bus: "Bus 04", seat: "14B", status: "Present", time: "06:01 AM", method: "QR Pass Scan" },
    { id: 3, name: "Aditya Nair", roll: "CS-2026-015", bus: "Bus 04", seat: "15A", status: "Present", time: "06:04 AM", method: "QR Pass Scan" },
    { id: 4, name: "Ananya Iyer", roll: "CS-2026-022", bus: "Bus 01", seat: "06A", status: "Present", time: "06:05 AM", method: "QR Pass Scan" },
    { id: 5, name: "Kavya Ramesh", roll: "CS-2026-056", bus: "Bus 01", seat: "06B", status: "Present", time: "06:07 AM", method: "QR Pass Scan" },
    { id: 6, name: "Sneha Sharma", roll: "CS-2026-042", bus: "Bus 02", seat: "11A", status: "Pending", time: "--", method: "--" },
    { id: 7, name: "Vignesh Rajan", roll: "CS-2026-118", bus: "Bus 02", seat: "11B", status: "Pending", time: "--", method: "--" },
    { id: 8, name: "Rahul Deshmukh", roll: "CS-2026-095", bus: "Bus 03", seat: "08A", status: "Pending", time: "--", method: "--" },
  ]);

  const total = attendees.length;
  const presentCount = attendees.filter((a) => a.status === "Present").length;
  const pendingCount = total - presentCount;
  const percentage = Math.round((presentCount / total) * 100);

  // Simulate scanning a student pass with camera viewfinder
  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      // Pick first pending student or simulate Fahad
      const pendingStudent = attendees.find((a) => a.status === "Pending");
      if (pendingStudent) {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setAttendees((prev) =>
          prev.map((a) =>
            a.id === pendingStudent.id
              ? { ...a, status: "Present", time: timeNow, method: "Camera QR Scanner" }
              : a
          )
        );
        setScanResult({
          success: true,
          student: pendingStudent,
          message: `Verified ${pendingStudent.name} (${pendingStudent.roll})!`,
        });
      } else {
        setScanResult({
          success: true,
          message: "All students present! No pending students in this checkpoint session.",
        });
      }
    }, 1200);
  };

  const toggleManualStatus = (id) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: a.status === "Present" ? "Pending" : "Present",
              time: a.status === "Present" ? "--" : timeNow,
              method: a.status === "Present" ? "--" : "Manual Faculty Override",
            }
          : a
      )
    );
  };

  const filteredAttendees = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Roll-Call & Checkpoint Security</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Live Attendance Scanner
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Scan student digital QR passes in real time or perform manual attendance reconciliation.
          </p>
        </div>

        {/* Checkpoint selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-600">Active Checkpoint:</label>
          <select
            value={selectedCheckpoint}
            onChange={(e) => setSelectedCheckpoint(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-emerald-950 focus:border-emerald-600 focus:outline-none shadow-sm"
          >
            <option value="Gate #2 Departure">Checkpoint 1: Gate #2 Departure (Dec 5, 06:00 AM)</option>
            <option value="Highway Breakfast Stop">Checkpoint 2: Highway Breakfast Stop (Dec 5, 09:30 AM)</option>
            <option value="Hotel Grand Ambience">Checkpoint 3: Hotel Check-in (Dec 5, 02:30 PM)</option>
            <option value="GIFT City Security">Checkpoint 4: GIFT City Security (Dec 6, 10:00 AM)</option>
          </select>
        </div>
      </div>

      {/* Progress & Stat Header */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
              <span className="uppercase tracking-wider text-emerald-900">
                Session Verification Progress
              </span>
              <span className="text-emerald-800 font-extrabold text-sm">{percentage}% Checked-in</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Session bound to: <strong>{selectedCheckpoint}</strong> • Verifying Officer: Dr. Rajesh Kumar
            </p>
          </div>

          <div className="flex items-center gap-4 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-8 text-center">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase">Present</p>
              <p className="text-2xl font-black text-emerald-700">{presentCount}</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase">Pending</p>
              <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase">Total</p>
              <p className="text-2xl font-black text-gray-900">{total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner & Manual Roster Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* QR Scanner Camera Simulation Viewport */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-emerald-800" />
                <h3 className="text-sm font-extrabold text-emerald-950">Camera Viewfinder</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                Live Scanner
              </span>
            </div>

            {/* Simulated Camera Window */}
            <div className="relative mx-auto flex h-64 w-full flex-col items-center justify-center rounded-2xl bg-gray-900 p-4 text-center overflow-hidden">
              {/* Scan target reticle overlay */}
              <div className="relative h-44 w-44 rounded-2xl border-2 border-emerald-400/80 bg-emerald-500/10 flex items-center justify-center">
                <div className="absolute inset-x-2 top-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
                <ScanLine size={64} className="text-emerald-400/60" />
              </div>

              {isScanning && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-xs">
                  <RefreshCw size={28} className="animate-spin text-emerald-400 mb-2" />
                  <p className="text-xs font-bold">Decoding Student QR Token...</p>
                </div>
              )}
            </div>

            {/* Scan Feedback Box */}
            {scanResult && (
              <div
                className={`mt-4 rounded-xl p-3.5 text-xs font-bold flex items-start gap-2.5 ${
                  scanResult.success
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-red-50 text-red-900 border border-red-200"
                }`}
              >
                <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p>{scanResult.message}</p>
                  {scanResult.student && (
                    <p className="mt-1 text-[11px] text-emerald-700 font-normal">
                      Allocated: {scanResult.student.bus} • Seat {scanResult.student.seat}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              type="button"
              disabled={isScanning}
              onClick={handleSimulateScan}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3 text-xs font-extrabold text-white shadow-md transition hover:bg-emerald-900 active:scale-95 disabled:opacity-60"
            >
              <Camera size={16} />
              <span>{isScanning ? "Scanning Pass..." : "Scan Student QR Pass"}</span>
            </button>
            <p className="mt-2 text-center text-[10px] text-gray-400">
              Camera optical scanner bound to 256-bit rotating token validation.
            </p>
          </div>
        </div>

        {/* Live Attendee Manifest */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-emerald-950">Roll-Call Checklist</h3>
              <p className="text-xs text-gray-500">
                Click any student row to manually toggle presence status with coordinator audit.
              </p>
            </div>

            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search attendee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredAttendees.map((student) => (
              <div
                key={student.id}
                onClick={() => toggleManualStatus(student.id)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-xs transition hover:bg-emerald-50/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold ${
                      student.status === "Present"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {student.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-emerald-950">{student.name}</p>
                      <span className="font-mono text-[10px] text-gray-500">{student.roll}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {student.bus} • Seat {student.seat} • Recorded: {student.method}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      student.status === "Present"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {student.status}
                  </span>
                  <span className="text-xs font-semibold text-gray-400 w-16 text-right">
                    {student.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Missing Roll Call Alert Button */}
          {pendingCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-center gap-2 text-xs text-amber-900">
                <AlertTriangle size={18} className="text-amber-700 shrink-0" />
                <span>
                  <strong>{pendingCount} Students</strong> unaccounted for at {selectedCheckpoint}.
                </span>
              </div>
              <button
                type="button"
                onClick={() => alert(`Dispatched emergency SMS reminder to ${pendingCount} pending students and their bus coordinators.`)}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 self-start sm:self-auto"
              >
                Send SMS Alert to Unaccounted
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
