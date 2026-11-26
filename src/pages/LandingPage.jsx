import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, ShieldCheck, MapPin, Sparkles } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <section
      className="relative min-h-screen w-full bg-cover bg-center pt-8 pb-16 flex flex-col justify-between"
      style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url('/images/landing-bg.png')" }}
    >
      {/* Top Navbar */}
      <nav className="relative z-10 mx-auto w-[calc(100%-2rem)] max-w-4xl">
        <div className="flex items-center justify-between rounded-full bg-white/95 px-6 py-3 shadow-xl backdrop-blur-md">
          <button
            type="button"
            className="flex items-center gap-2 text-left"
            onClick={() => navigate("/")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white shadow-sm">
              IV
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">
              IV Connect
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-xs font-semibold text-gray-700 hover:text-emerald-700 transition">Highlights</a>
            <button
              type="button"
              onClick={() => navigate("/coordinator/dashboard")}
              className="text-xs font-semibold text-gray-700 hover:text-emerald-700 transition"
            >
              Coordinator Portal
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/dashboard")}
              className="text-xs font-semibold text-gray-700 hover:text-emerald-700 transition"
            >
              Admin Deck
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => navigate("/login")}
              className="rounded-full bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-emerald-800 active:scale-95"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-white my-auto py-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-md">
          <Sparkles size={14} className="text-emerald-400" />
          <span>Industrial Visit 2026 Portal</span>
        </div>

        <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl text-white drop-shadow-md">
          Every Journey Begins With Connection
        </h1>

        <p className="mt-4 text-base sm:text-lg text-white/90 leading-relaxed max-w-xl mx-auto">
          The unified digital platform for engineering students to track schedules, bus logistics, hotel accommodation, and live QR attendance.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg transition hover:bg-emerald-500 active:scale-95"
          >
            <span>Student Portal</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/coordinator/dashboard")}
            className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-5 py-3.5 text-xs sm:text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95"
          >
            <ShieldCheck size={16} />
            <span>Coordinator View</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/20 px-5 py-3.5 text-xs sm:text-sm font-bold text-amber-200 backdrop-blur-md transition hover:bg-amber-500/30 active:scale-95"
          >
            <span>Chief Admin Deck</span>
          </button>
        </div>
      </div>

      {/* Highlights Bar */}
      <div id="features" className="relative z-10 mx-auto w-[calc(100%-2rem)] max-w-4xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-black/40 p-4 backdrop-blur-md border border-white/10 text-white">
          <div className="flex items-center gap-3 p-2">
            <MapPin size={24} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">GIFT City & Ahmedabad</p>
              <p className="text-[11px] text-white/70">FinTech & Aerospace Tour</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 border-t sm:border-t-0 sm:border-l border-white/10">
            <ShieldCheck size={24} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">Digital QR Checkpoints</p>
              <p className="text-[11px] text-white/70">Real-time Safety Attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 border-t sm:border-t-0 sm:border-l border-white/10">
            <Compass size={24} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">4 Days • Dec 5-8</p>
              <p className="text-[11px] text-white/70">Buses, Hotel & Itinerary</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPage;
