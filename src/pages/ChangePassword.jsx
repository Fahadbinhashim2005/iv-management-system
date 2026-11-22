import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { profile, changePassword, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isMinLength = password.length >= 8;
  const isMatching = password && password === confirmPassword;
  const isValid = isMinLength && isMatching;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValid) {
      setErrorMsg('Please ensure your password is at least 8 characters and both fields match.');
      return;
    }

    try {
      setLoading(true);
      await changePassword(password);
      setSuccessMsg('Password updated successfully! Redirecting to your dashboard...');

      setTimeout(() => {
        const dest = profile?.role ? `/${profile.role}/dashboard` : '/student/dashboard';
        navigate(dest, { replace: true });
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-100 sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
            <LockKeyhole size={32} strokeWidth={2.2} />
          </div>
          <h2 className="mt-4 text-2xl font-black text-gray-900 tracking-tight sm:text-3xl">
            First Login Password Reset
          </h2>
          <p className="mt-2 text-xs text-gray-600 sm:text-sm">
            Your account was provisioned with a temporary administrator key. Please choose a new secure password to activate your access.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-700 border border-red-200">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                New Secure Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter 8+ characters"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 shadow-xs"
              />
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="rounded-2xl bg-gray-50 p-3.5 space-y-2 border border-gray-100 text-xs text-gray-600">
            <div className={`flex items-center gap-2 font-medium ${isMinLength ? 'text-emerald-700' : 'text-gray-500'}`}>
              <ShieldCheck size={14} className={isMinLength ? 'text-emerald-600' : 'text-gray-400'} />
              <span>At least 8 characters long</span>
            </div>
            <div className={`flex items-center gap-2 font-medium ${isMatching ? 'text-emerald-700' : 'text-gray-500'}`}>
              <ShieldCheck size={14} className={isMatching ? 'text-emerald-600' : 'text-gray-400'} />
              <span>Passwords match exactly</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`w-full rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition ${
                isValid && !loading
                  ? 'bg-emerald-800 hover:bg-emerald-900 active:scale-95'
                  : 'bg-gray-300 cursor-not-allowed opacity-75'
              }`}
            >
              {loading ? 'Securing Account...' : 'Set Password & Enter Portal'}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-800"
            >
              Sign out and return later
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
