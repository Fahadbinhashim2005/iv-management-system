import { useEffect } from 'react';
import { PhoneCall, ShieldAlert, X, Building2, Bus, Copy, Stethoscope, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { tripConfig } from '../../config/tripConfig';

function getHelplineIcon(role = '') {
  const lower = role.toLowerCase();
  if (lower.includes('medical') || lower.includes('safety')) return { icon: Stethoscope, tone: 'bg-red-100 text-red-700' };
  if (lower.includes('hotel')) return { icon: Building2, tone: 'bg-purple-100 text-purple-800' };
  if (lower.includes('transport') || lower.includes('driver')) return { icon: Bus, tone: 'bg-blue-100 text-blue-800' };
  return { icon: Users, tone: 'bg-emerald-100 text-emerald-800' };
}

const HELPLINES = (tripConfig.helplines || []).map((h) => {
  const { icon, tone } = getHelplineIcon(h.role);
  return {
    title: h.role,
    subtitle: h.person,
    phone: h.phone,
    display: h.display || h.phone,
    icon,
    tone,
  };
});

export default function EmergencyHelpModal({ isOpen, onClose }) {
  const { profile } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copySafetyCard = () => {
    const text = [
      `IV Connect Safety Card`,
      `Name: ${profile?.full_name || 'Participant'}`,
      `Role: ${profile?.role || 'student'}`,
      profile?.roll_no ? `Roll No: ${profile.roll_no}` : null,
      profile?.blood_group ? `Blood Group: ${profile.blood_group}` : null,
      profile?.emergency_phone ? `Emergency Contact: ${profile.emergency_phone}` : null,
      profile?.guardian_name ? `Guardian: ${profile.guardian_name}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard?.writeText(text);
    toast.success('Copied emergency safety details to clipboard.');
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tour Emergency & Helpline Contacts"
        className="w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-gray-200 sm:hidden" />

        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-emerald-950">Emergency &amp; Helplines</h3>
              <p className="text-xs text-gray-500">24/7 tour support, medical &amp; hotel contacts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close emergency contacts"
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* National Emergency Banner */}
        <a
          href="tel:112"
          className="flex items-center justify-between rounded-2xl bg-red-600 px-4 py-3 text-white shadow-sm hover:bg-red-700 transition"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-red-100">
              National Emergency Helpline
            </p>
            <p className="text-sm font-extrabold">Police • Ambulance • Fire (112)</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-red-700">
            <PhoneCall size={14} /> Call 112
          </span>
        </a>

        {/* Tour Helplines */}
        <div className="space-y-2.5">
          {HELPLINES.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.title}
                href={`tel:${item.phone}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 hover:bg-emerald-50/50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-emerald-950">{item.title}</p>
                    <p className="truncate text-[11px] text-gray-500">{item.subtitle}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800 ring-1 ring-gray-200">
                  {item.display}
                </span>
              </a>
            );
          })}
        </div>

        {/* User's quick safety card */}
        {profile && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-emerald-950">My Safety Summary</span>
              <button
                type="button"
                onClick={copySafetyCard}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
              >
                <Copy size={12} /> Copy Card
              </button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-emerald-900">
              <span>
                <strong>Name:</strong> {profile.full_name}
              </span>
              {profile.blood_group && (
                <span>
                  <strong>Blood:</strong> {profile.blood_group}
                </span>
              )}
              {profile.emergency_phone && (
                <span>
                  <strong>ICE:</strong> {profile.emergency_phone}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
