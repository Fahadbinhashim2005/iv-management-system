export default function NotchTitle({ eyebrow, title, isToday = false }) {
  const parts = String(eyebrow || "").split("·").map((s) => s.trim());
  const dayPart = parts[0] || "";
  const statusPart = parts[1] || "";

  return (
    <div className="relative flex flex-col items-center text-center w-full">
      {/* Top white curved dome/notch dipping into the hero photo (Canva page 1) */}
      <div className="pointer-events-none relative -mt-4 mb-1 flex w-full justify-center">
        <div className="relative flex flex-col items-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 320 122"
            className="h-24 w-64 sm:h-28 sm:w-72 drop-shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 L320,0 C282,0 265,120 160,120 C55,120 38,0 0,0 Z"
              fill="#ffffff"
            />
          </svg>

          {/* IV Connect circular crest */}
          <div className="absolute top-2.5 flex h-14 w-14 sm:h-16 sm:w-16 flex-col items-center justify-center rounded-full bg-[#065F46] text-white shadow-sm ring-2 ring-emerald-900/15">
            <span className="text-[7px] font-extrabold uppercase tracking-widest text-emerald-100 leading-none">
              IV CONNECT
            </span>
            <span className="font-display text-xl sm:text-2xl leading-none tracking-wider text-white mt-0.5">
              IV
            </span>
            <span className="text-[6px] font-bold uppercase tracking-wider text-emerald-200 leading-none">
              TOUR
            </span>
          </div>

          {/* Eyebrow inside lower rim of white notch */}
          <p className="absolute bottom-2.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#065F46]">
            <span>{dayPart}</span>
            {statusPart && (
              <>
                <span className="text-gray-400">•</span>
                <span className={isToday ? "text-[#F59E0B]" : "text-emerald-700"}>
                  {statusPart}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <h1 className="font-display px-4 text-6xl sm:text-8xl leading-[0.86] text-white drop-shadow-[0_6px_22px_rgba(0,0,0,0.5)] uppercase break-words max-w-full">
        {title}
      </h1>
    </div>
  );
}
