import { Component, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';
import { parseScanPayload } from '../utils/parseScanPayload';
import QrScanner from '../components/QrScanner';
import ScanResultScreen from '../components/ScanResultScreen';

class ScanErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-md">
          <h2 className="text-lg font-extrabold text-emerald-950">Scan completed</h2>
          <p className="mt-2 text-xs text-gray-600">
            Return to your attendance page to view your updated status.
          </p>
          <Link
            to="/student/attendance"
            className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white"
          >
            Go to Attendance
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

function requestCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => reject(new Error('Location permission denied. Please enable location and try again.')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function StudentScan() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkToken = searchParams.get('t');

  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [needsLocationToken, setNeedsLocationToken] = useState(null);
  const deepLinkSubmittedRef = useRef(false);

  const submitToken = useCallback(async (rawText, location = null) => {
    const parsed = parseScanPayload(rawText);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setVerifying(true);
    setError(null);
    setResult(null);

    try {
      const data = await attendanceApi.scanQr({ token: parsed.token, location });
      setNeedsLocationToken(null);
      setResult(data);
    } catch (err) {
      if (err.code === 'LOCATION_REQUIRED' && !location) {
        setNeedsLocationToken(parsed.token);
      } else {
        setError(err.message || "This isn't a valid attendance QR.");
      }
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (deepLinkToken && !deepLinkSubmittedRef.current) {
      deepLinkSubmittedRef.current = true;
      const t = setTimeout(() => submitToken(deepLinkToken), 0);
      return () => clearTimeout(t);
    }
  }, [deepLinkToken, submitToken]);

  const handleShareLocationAndRetry = async () => {
    if (!needsLocationToken) return;
    setVerifying(true);
    try {
      const loc = await requestCurrentPosition();
      await submitToken(needsLocationToken, loc);
    } catch (err) {
      setNeedsLocationToken(null);
      setError(err.message || 'Location is required for this session.');
      setVerifying(false);
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    setError(null);
    setNeedsLocationToken(null);
    if (deepLinkToken) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleDecode = useCallback(
    (text) => {
      submitToken(text);
    },
    [submitToken]
  );

  return (
    <ScanErrorBoundary>
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <Link
          to="/student/attendance"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={15} /> Back
        </Link>
        <h1 className="text-base font-extrabold text-emerald-950">Scan Attendance QR</h1>
        <div className="w-16" />
      </div>

      {verifying ? (
        <div className="rounded-3xl border border-emerald-100 bg-white p-10 text-center shadow-xs">
          <Loader2 size={36} className="mx-auto mb-3 animate-spin text-emerald-700" />
          <p className="text-sm font-extrabold text-emerald-950">Verifying…</p>
          <p className="mt-1 text-xs text-gray-500">Recording your attendance securely</p>
        </div>
      ) : needsLocationToken ? (
        <div className="rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <MapPin size={26} />
          </div>
          <h2 className="text-lg font-extrabold text-emerald-950">Location verification required</h2>
          <p className="mt-2 text-xs text-gray-600">
            This session verifies that you are at the visit venue. Allow location access to complete your check-in.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleShareLocationAndRetry}
              className="min-h-[48px] w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-800"
            >
              Allow Location & Mark Present
            </button>
            <button
              type="button"
              onClick={handleScanAgain}
              className="min-h-[44px] w-full rounded-2xl border border-gray-200 px-5 py-2 text-xs font-bold text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : result || error ? (
        <ScanResultScreen result={result} error={error} onScanAgain={handleScanAgain} />
      ) : (
        <QrScanner onDecode={handleDecode} disabled={verifying} />
      )}
    </div>
    </ScanErrorBoundary>
  );
}
