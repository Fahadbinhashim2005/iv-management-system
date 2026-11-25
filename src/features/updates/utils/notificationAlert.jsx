import toast from 'react-hot-toast';

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  return sharedAudioCtx;
}

/**
 * Unlock browser audio context on a user gesture so mobile/desktop browsers
 * allow playing the notification chime when a broadcast arrives.
 */
export async function unlockAlertAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === 'running';
}

/**
 * Play a distinctive multi-tone IV Connect notification chime via Web Audio API,
 * plus phone vibration where supported.
 */
export async function playSpecialNotificationSound(category = 'general') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(
        category === 'urgent' ? [250, 100, 250, 100, 300] : [200, 100, 200]
      );
    } catch {
      // Ignore vibrate restrictions
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const now = ctx.currentTime;
  const notes =
    category === 'urgent'
      ? [
          { freq: 880, start: 0, dur: 0.14 },
          { freq: 1108.73, start: 0.12, dur: 0.14 },
          { freq: 1318.51, start: 0.24, dur: 0.22 },
          { freq: 880, start: 0.54, dur: 0.14 },
          { freq: 1108.73, start: 0.66, dur: 0.14 },
          { freq: 1318.51, start: 0.78, dur: 0.28 },
        ]
      : [
          { freq: 659.25, start: 0, dur: 0.15 },
          { freq: 830.61, start: 0.13, dur: 0.15 },
          { freq: 987.77, start: 0.26, dur: 0.3 },
        ];

  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = category === 'urgent' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(n.freq, now + n.start);

    gain.gain.setValueAtTime(0.001, now + n.start);
    gain.gain.exponentialRampToValueAtTime(0.24, now + n.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.02);
  }
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  await unlockAlertAudio();
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'default';
  }
}

/**
 * Trigger both Phone/Desktop OS Notification and an interactive in-app Toast
 * with direct Google Maps launch button.
 */
export function triggerAnnouncementAlert(announcement, { onView } = {}) {
  if (!announcement) return;

  if (announcement.playSound !== false) {
    playSpecialNotificationSound(announcement.category);
  }

  // 1. In-app rich toast banner
  toast.custom(
    (t) => (
      <div
        className={`max-w-sm w-full rounded-2xl border bg-white p-4 shadow-xl transition ${
          announcement.category === 'urgent'
            ? 'border-red-300 ring-2 ring-red-200'
            : 'border-emerald-200 ring-1 ring-emerald-100'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
              announcement.category === 'urgent'
                ? 'bg-red-100 text-red-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {announcement.category || 'Notice'}
          </span>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="text-xs font-bold text-gray-400 hover:text-gray-700"
          >
            Dismiss
          </button>
        </div>

        <p className="mt-1.5 text-sm font-extrabold text-emerald-950">{announcement.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{announcement.content}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {announcement.locationUrl && (
            <a
              href={announcement.locationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => toast.dismiss(t.id)}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              Open Google Maps
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id);
              onView?.(announcement);
            }}
            className="inline-flex items-center rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
          >
            View Update
          </button>
        </div>
      </div>
    ),
    { duration: 9000 }
  );

  // 2. OS / Phone Browser Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const bodyText = announcement.locationName
      ? `${announcement.content} — Location: ${announcement.locationName}`
      : announcement.content;

    try {
      const notif = new Notification(`IV Connect • ${announcement.title}`, {
        body: bodyText,
        tag: `iv-announcement-${announcement.id}`,
        requireInteraction: announcement.category === 'urgent',
      });
      notif.onclick = () => {
        window.focus();
        if (announcement.locationUrl) {
          window.open(announcement.locationUrl, '_blank', 'noopener,noreferrer');
        } else {
          onView?.(announcement);
        }
        notif.close();
      };
    } catch {
      // Ignore environments requiring ServiceWorkerRegistration.showNotification
    }
  }
}
