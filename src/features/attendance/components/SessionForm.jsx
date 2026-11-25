import { useState, useEffect } from 'react';
import { X, AlertTriangle, MapPin } from 'lucide-react';
import { PURPOSE_OPTIONS, attendanceApi } from '../api/attendanceApi';

export default function SessionForm({ open, existingSessions = [], onCreated, onClose }) {
  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitId, setVisitId] = useState('');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('boarding');
  const [details, setDetails] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [rotateSeconds, setRotateSeconds] = useState(30);
  const [requireLocation, setRequireLocation] = useState(false);
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');
  const [geoRadiusM, setGeoRadiusM] = useState(150);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const loadVisits = async () => {
      setVisitsLoading(true);
      try {
        const list = await attendanceApi.listVisits();
        if (!mounted) return;
        const valid = Array.isArray(list) ? list : [];
        setVisits(valid);
        if (valid.length > 0) {
          setVisitId((prev) => prev || valid[0].id);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load industrial visits.');
      } finally {
        if (mounted) setVisitsLoading(false);
      }
    };
    loadVisits();
    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasActiveForVisit = existingSessions.some(
    (s) => s.visit_id === visitId && (s.effectiveStatus || s.status) === 'active'
  );

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(String(pos.coords.latitude.toFixed(6)));
        setGeoLng(String(pos.coords.longitude.toFixed(6)));
      },
      () => setError('Could not read your current location.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!visitId) return setError('Please select a visit.');
    if (title.trim().length < 3) return setError('Title must be at least 3 characters.');

    const payload = {
      visitId,
      title: title.trim(),
      purpose,
      details: details.trim() || undefined,
      closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
      rotateSeconds: Number(rotateSeconds),
      requireLocation,
    };

    if (requireLocation && geoLat && geoLng) {
      payload.geo = {
        lat: Number(geoLat),
        lng: Number(geoLng),
        radiusM: Number(geoRadiusM) || 150,
      };
    }

    setSubmitting(true);
    try {
      const created = await attendanceApi.createSession(payload);
      onCreated(created);
    } catch (err) {
      setError(err.message || 'Failed to create attendance session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="create-session-title" className="text-lg font-extrabold text-emerald-950">
            New Attendance Session
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Industrial Visit</label>
            <select
              value={visitId}
              disabled={visitsLoading || visits.length === 0}
              onChange={(e) => setVisitId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-gray-50"
            >
              {visitsLoading ? (
                <option value="">Loading visits...</option>
              ) : visits.length === 0 ? (
                <option value="">No visits found in database</option>
              ) : (
                visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({v.code || v.id.slice(0, 8)})
                  </option>
                ))
              )}
            </select>
          </div>

          {hasActiveForVisit && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <span>Another attendance is live for this visit — students will see both.</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bus boarding – Day 1"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Purpose</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {PURPOSE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Details (optional)
            </label>
            <textarea
              rows={2}
              maxLength={1000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Any instructions for coordinators or students..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Auto-close (optional)
              </label>
              <input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                QR refresh interval (15–120s)
              </label>
              <input
                type="number"
                min={15}
                max={120}
                value={rotateSeconds}
                onChange={(e) => setRotateSeconds(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-3 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-gray-800">Require student location</span>
              <input
                type="checkbox"
                checked={requireLocation}
                onChange={(e) => setRequireLocation(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-700 focus:ring-emerald-500"
              />
            </label>

            {requireLocation && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900"
                >
                  <MapPin size={14} /> Use my current location
                </button>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Lat"
                    value={geoLat}
                    onChange={(e) => setGeoLat(e.target.value)}
                    className="rounded-lg border border-gray-200 px-2.5 py-2 text-xs"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Lng"
                    value={geoLng}
                    onChange={(e) => setGeoLng(e.target.value)}
                    className="rounded-lg border border-gray-200 px-2.5 py-2 text-xs"
                  />
                  <input
                    type="number"
                    min={20}
                    max={5000}
                    placeholder="Radius (m)"
                    value={geoRadiusM}
                    onChange={(e) => setGeoRadiusM(e.target.value)}
                    className="rounded-lg border border-gray-200 px-2.5 py-2 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Start Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
