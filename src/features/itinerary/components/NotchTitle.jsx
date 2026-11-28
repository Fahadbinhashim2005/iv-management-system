export default function NotchTitle({ eyebrow, title, isToday = false }) {
  return (
    <div className="relative flex flex-col items-center text-center px-4">
      {/* Top white rounded notch cut-out (SVG curve, no raster image) */}
      <div className="pointer-events-none relative -mt-1 mb-2 flex w-full justify-center">
        <div className="relative inline-flex flex-col items-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 260 56"
            className="h-12 w-56 sm:h-14 sm:w-64 drop-shadow-sm"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 L260,0 C220,0 205,54 130,54 C55,54 40,0 0,0 Z"
              fill="#ffffff"
            />
          </svg>
          <span
            className={`absolute top-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest ${
              isToday
                ? "bg-amber-100 text-amber-900"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {isToday && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse" />
            )}
            {eyebrow}
          </span>
        </div>
      </div>

      <h1 className="font-display text-5xl sm:text-7xl leading-[0.9] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)] uppercase break-words max-w-full">
        {title}
      </h1>
    </div>
  );
}
