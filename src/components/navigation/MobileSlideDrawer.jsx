import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Reusable mobile slide-to-access sidebar drawer:
 * - Edge swipe from left (touchstart <= 36px, swipe right >= 45px) opens drawer
 * - Swipe left inside drawer, tap backdrop, or press Escape closes drawer
 * - Subtle edge handle tab on mobile lets users tap or slide open anytime
 */
export default function MobileSlideDrawer({
  isOpen,
  onOpen,
  onClose,
  ariaLabel = 'Navigation menu',
  children,
}) {
  const touchStartRef = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Edge swipe to open on mobile (< 1024px)
  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.innerWidth >= 1024 || isOpen) return;
      const t = e.touches?.[0];
      if (!t || t.clientX > 36) return;
      touchStartRef.current = { x: t.clientX, y: t.clientY, mode: 'open' };
    };

    const handleTouchMove = (e) => {
      const start = touchStartRef.current;
      if (!start || start.mode !== 'open') return;
      const t = e.touches?.[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20) {
        touchStartRef.current = null;
        return;
      }
      if (dx > 48 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        touchStartRef.current = null;
        onOpen?.();
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onOpen]);

  // Body scroll lock + Escape key when open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleDrawerTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY, mode: 'close' };
  };

  const handleDrawerTouchMove = (e) => {
    const start = touchStartRef.current;
    if (!start || start.mode !== 'close') return;
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (dx < 0 && Math.abs(dx) > Math.abs(dy)) {
      setDragOffset(Math.max(-260, dx));
    }
  };

  const handleDrawerTouchEnd = () => {
    if (dragOffset < -55) {
      onClose?.();
    }
    setDragOffset(0);
    touchStartRef.current = null;
  };

  return (
    <>
      {/* Subtle left-edge swipe/tap tab on mobile when closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => onOpen?.()}
          aria-label="Slide or tap to open navigation sidebar"
          className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex h-14 w-5 items-center justify-center rounded-r-xl border border-l-0 border-emerald-200 bg-white/90 text-emerald-700 shadow-md backdrop-blur-xs lg:hidden hover:w-6 hover:bg-emerald-50 active:scale-95 transition-all"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      )}

      {/* Drawer Backdrop & Panel */}
      <div
        className={`fixed inset-0 z-[65] flex lg:hidden transition-opacity duration-200 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!isOpen}
      >
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          onClick={() => onClose?.()}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          onTouchStart={handleDrawerTouchStart}
          onTouchMove={handleDrawerTouchMove}
          onTouchEnd={handleDrawerTouchEnd}
          style={{
            transform: isOpen ? `translateX(${dragOffset}px)` : 'translateX(-100%)',
          }}
          className="relative z-10 flex h-full w-[85%] max-w-xs flex-col justify-between bg-white p-5 shadow-2xl transition-transform duration-200 ease-out pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          {children}
        </div>
      </div>
    </>
  );
}
