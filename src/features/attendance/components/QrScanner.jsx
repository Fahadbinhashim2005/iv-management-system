import { useEffect, useRef, useState } from 'react';
import { CameraOff, Flashlight, RefreshCw, KeyRound } from 'lucide-react';

export default function QrScanner({ onDecode, disabled }) {
  const containerId = 'iv-qr-reader';
  const scannerRef = useRef(null);
  const decodedRef = useRef(false);

  const [cameraError, setCameraError] = useState(null); // 'permission' | 'nocamera' | 'insecure' | 'generic'
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (disabled) return;
    decodedRef.current = false;

    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setTimeout(() => setCameraError('insecure'), 0);
      return;
    }

    let cancelled = false;
    let instance = null;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        instance = new Html5Qrcode(containerId);
        scannerRef.current = instance;

        await instance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (decodedRef.current) return;
            decodedRef.current = true;
            try {
              await instance.stop();
            } catch {
              // Ignore stop errors
            }
            onDecode(decodedText);
          },
          () => {
            // Ignore per-frame decode misses
          }
        );

        // Detect torch capability if supported by browser/camera
        try {
          const track = instance.getRunningTrack?.();
          const caps = track?.getCapabilities?.();
          if (caps?.torch && !cancelled) {
            setTorchSupported(true);
          }
        } catch {
          // Ignore torch capability check errors
        }
      } catch (err) {
        if (cancelled) return;
        const msg = String(err?.message || err || '').toLowerCase();
        if (msg.includes('permission') || msg.includes('notallowed') || msg.includes('denied')) {
          setCameraError('permission');
        } else if (msg.includes('notfound') || msg.includes('no camera') || msg.includes('devicenotfound')) {
          setCameraError('nocamera');
        } else {
          setCameraError('generic');
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
    };
  }, [onDecode, disabled]);

  const toggleTorch = async () => {
    try {
      const next = !torchOn;
      await scannerRef.current?.applyVideoConstraints?.({
        advanced: [{ torch: next }],
      });
      setTorchOn(next);
    } catch {
      // Ignore torch toggle errors
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onDecode(manualCode.trim());
  };

  if (cameraError) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-xs">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <CameraOff size={26} />
        </div>
        <h3 className="text-base font-extrabold text-emerald-950">
          {cameraError === 'permission'
            ? 'Camera permission blocked'
            : cameraError === 'insecure'
              ? 'HTTPS required for camera'
              : cameraError === 'nocamera'
                ? 'No camera detected'
                : 'Unable to start camera'}
        </h3>
        <p className="mt-1.5 text-xs text-gray-600 max-w-sm mx-auto">
          {cameraError === 'permission'
            ? 'Allow camera access in your browser site settings, then reload this page. Or ask your coordinator to mark you present manually.'
            : cameraError === 'insecure'
              ? 'Camera scanning requires an HTTPS connection (or localhost during development).'
              : 'No usable rear camera was found on this device. You can paste a QR link/code below or ask your coordinator to mark you manually.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
          >
            <RefreshCw size={14} /> Try again
          </button>
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            <KeyRound size={14} /> Enter code manually
          </button>
        </div>

        {showManual && (
          <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste QR link or v1. token..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
            >
              Submit
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-200 bg-black shadow-lg">
        <div id={containerId} className="w-full min-h-[300px]" />

        {torchSupported && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
            className={`absolute bottom-4 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition ${
              torchOn ? 'bg-amber-400 text-gray-900' : 'bg-black/60 text-white hover:bg-black/80'
            }`}
          >
            <Flashlight size={20} />
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-600">
        Point your camera at the live QR code on your coordinator&apos;s or admin&apos;s screen.
      </p>
    </div>
  );
}
