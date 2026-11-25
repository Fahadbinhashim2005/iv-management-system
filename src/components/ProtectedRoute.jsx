import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { profile, loading, user } = useAuth();
  const location = useLocation();
  const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, redirect to login
  if (!user || !profile) {
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  // If deactivated, redirect to login
  if (profile.is_active === false) {
    return <Navigate to="/login" replace />;
  }

  // First-time login password change mandate
  if (profile.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  const userRole = (profile.role || '').toLowerCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  // Role authorization check (Admins are granted access across portals)
  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole) && userRole !== 'admin') {
    return <Navigate to={`/${userRole}/dashboard`} replace />;
  }

  return <Outlet />;
}
