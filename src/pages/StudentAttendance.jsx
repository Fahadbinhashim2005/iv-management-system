import { useState } from "react";
import { 
  ScanQrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  QrCode
} from "lucide-react";

export default function StudentAttendance() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);

  const handleSimulateCheckIn = () => {
    if (!isCheckedIn) {
      setIsCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const attendanceLogs = [
    {
      checkpoint: "Departure Gate Checkpoint #2",
      date: "Dec 5, 2026",
      status: isCheckedIn ? "Verified" : "Pending",
      time: isCheckedIn ? (checkInTime || "Just now") : "Scheduled 06:00 AM",
      verifiedBy: "Prof. Anjali Menon",
    },
    {
      checkpoint: "Highway Breakfast Stop",
      date: "Dec 5, 2026",
      status: "Upcoming",
      time: "Scheduled 09:30 AM",
      verifiedBy: "Bus Coordinator",
    },
    {
      checkpoint: "Hotel Grand Ambience Check-in",
      date: "Dec 5, 2026",
      status: "Upcoming",
      time: "Scheduled 02:30 PM",
      verifiedBy: "Dr. Rajesh Kumar",
    },
    {
      checkpoint: "GIFT City Main Entrance Security",
      date: "Dec 6, 2026",
      status: "Upcoming",
      time: "Scheduled 10:00 AM",
      verifiedBy: "GIFT City Security",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-700">Digital Verification</p>
        <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
          Digital QR Attendance
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Show your personalized digital pass to the faculty coordinator or scan checkpoint QR codes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* QR Pass Card */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="bg-emerald-600 p-6 text-center text-white">
            <span className="inline-block rounded-full bg-emerald-500/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100">
              Official Student Pass
            </span>
            <h2 className="mt-2 text-xl font-bold">Fahad Bin Hashim</h2>
            <p className="text-xs text-emerald-100">B.Tech Computer Science • Roll #CS-2026-084</p>
          </div>

          <div className="p-6 text-center">
            {/* Mock QR Code Graphic */}
            <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4">
              <div className="relative flex flex-col items-center justify-center">
                <QrCode size={130} className="text-emerald-800" />
                <span className="mt-2 text-[11px] font-mono font-semibold text-emerald-700">
                  IV2026-STU-084-SEC
                </span>
              </div>
            </div>

            <div className="mt-6">
              {isCheckedIn ? (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>Check-in Verified at {checkInTime}!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSimulateCheckIn}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                >
                  <ScanQrCode size={18} />
                  <span>Simulate Coordinator Scan</span>
                </button>
              )}
            </div>

            <p className="mt-3 text-[11px] text-gray-400">
              Pass is digitally cryptographically signed. Do not share screenshots.
            </p>
          </div>
        </div>

        {/* Checkpoint Logs */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-bold text-emerald-950">Attendance Checkpoints</h3>
            <p className="text-xs text-gray-500">
              Mandatory presence checks throughout the tour to ensure all students are accounted for.
            </p>

            <div className="mt-4 space-y-3">
              {attendanceLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 transition hover:bg-emerald-50/30"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        log.status === "Verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : log.status === "Pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {log.status === "Verified" ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Clock size={16} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        {log.checkpoint}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Coordinator: {log.verifiedBy} • {log.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:text-right">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        log.status === "Verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : log.status === "Pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="text-xs text-gray-500">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Safety Alert */}
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">Missing Roll-Call Policy:</span> If you are unable to check in within 15 minutes of scheduled time, the system automatically alerts Dr. Rajesh Kumar and the emergency contact numbers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
