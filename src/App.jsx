import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster, useToasterStore } from 'react-hot-toast';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';

// Student Portal (route-level code splitting)
import StudentLayout from './layouts/StudentLayout';
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentItinerary = lazy(() => import('./pages/StudentItinerary'));
const StudentAttendance = lazy(() => import('./features/attendance/pages/StudentAttendance'));
const StudentScan = lazy(() => import('./features/attendance/pages/StudentScan'));
const StudentTransport = lazy(() => import('./pages/StudentTransport'));
const StudentAccommodation = lazy(() => import('./pages/StudentAccommodation'));
const StudentAnnouncements = lazy(() => import('./pages/StudentAnnouncements'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));

// Coordinator Portal (route-level code splitting)
import CoordinatorLayout from './layouts/CoordinatorLayout';
const CoordinatorDashboard = lazy(() => import('./pages/coordinator/CoordinatorDashboard'));
const CoordinatorItinerary = lazy(() => import('./pages/coordinator/CoordinatorItinerary'));
const CoordinatorParticipants = lazy(() => import('./pages/coordinator/CoordinatorParticipants'));
const CoordinatorAttendanceList = lazy(() => import('./features/attendance/pages/CoordinatorAttendanceList'));
const CoordinatorAttendanceSession = lazy(() => import('./features/attendance/pages/CoordinatorAttendanceSession'));
const CoordinatorTransport = lazy(() => import('./pages/coordinator/CoordinatorTransport'));
const CoordinatorAccommodation = lazy(() => import('./pages/coordinator/CoordinatorAccommodation'));
const CoordinatorAnnouncements = lazy(() => import('./pages/coordinator/CoordinatorAnnouncements'));
const CoordinatorReports = lazy(() => import('./pages/coordinator/CoordinatorReports'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));

// Admin Portal (Superior Authority / Chief Coordinator)
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVisits from './pages/admin/AdminVisits';
import AdminCoordinators from './pages/admin/AdminCoordinators';
import AdminStudents from './pages/admin/AdminStudents';
import AdminLogistics from './pages/admin/AdminLogistics';
import AdminFinances from './pages/admin/AdminFinances';
import AdminCompliance from './pages/admin/AdminCompliance';
import AdminLogs from './pages/admin/AdminLogs';
import AdminAttendanceList from './features/attendance/pages/AdminAttendanceList';
import AdminAttendanceSession from './features/attendance/pages/AdminAttendanceSession';
import AdminRoomsPage from './features/rooms/pages/AdminRoomsPage';
const AdminItineraryList = lazy(() => import('./features/itinerary/pages/AdminItineraryList'));
const AdminItineraryEditor = lazy(() => import('./features/itinerary/pages/AdminItineraryEditor'));

function LimitedToaster() {
  const { toasts } = useToasterStore();

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, idx) => idx >= 2)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  return (
    <Toaster
      position="top-center"
      containerStyle={{
        top: 'max(0.75rem, env(safe-area-inset-top))',
        zIndex: 90,
      }}
      toastOptions={{
        duration: 3000,
        success: { duration: 2500 },
        error: { duration: 4000 },
      }}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <LimitedToaster />
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#F4F8F5] p-6 space-y-4">
              <div className="h-10 w-56 rounded-2xl bg-white motion-safe:animate-pulse" />
              <div className="h-44 rounded-3xl bg-white motion-safe:animate-pulse" />
            </div>
          }
        >
          <Routes>
          {/* Public Landing & Authentication */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Student Portal (Protected) */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="itinerary" element={<StudentItinerary />} />
              <Route path="attendance" element={<StudentAttendance />} />
              <Route path="attendance/scan" element={<StudentScan />} />
              <Route path="transport" element={<StudentTransport />} />
              <Route path="accommodation" element={<StudentAccommodation />} />
              <Route path="announcements" element={<StudentAnnouncements />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>
          </Route>

          {/* Coordinator Portal (Protected) */}
          <Route element={<ProtectedRoute allowedRoles={['coordinator']} />}>
            <Route path="/coordinator" element={<CoordinatorLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<CoordinatorDashboard />} />
              <Route path="visits" element={<Navigate to="/coordinator/itinerary" replace />} />
              <Route path="itinerary" element={<CoordinatorItinerary />} />
              <Route path="students" element={<CoordinatorParticipants />} />
              <Route path="participants" element={<Navigate to="/coordinator/students" replace />} />
              <Route path="attendance" element={<CoordinatorAttendanceList />} />
              <Route path="attendance/:sessionId" element={<CoordinatorAttendanceSession />} />
              <Route path="transport" element={<CoordinatorTransport />} />
              <Route path="accommodation" element={<CoordinatorAccommodation />} />
              <Route path="announcements" element={<CoordinatorAnnouncements />} />
              <Route path="reports" element={<CoordinatorReports />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Admin Portal (Protected) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="visits" element={<AdminVisits />} />
              <Route path="itineraries" element={<AdminItineraryList />} />
              <Route path="itineraries/:id" element={<AdminItineraryEditor />} />
              <Route path="coordinators" element={<AdminCoordinators />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="logistics" element={<AdminLogistics />} />
              <Route path="rooms" element={<AdminRoomsPage />} />
              <Route path="finances" element={<AdminFinances />} />
              <Route path="compliance" element={<AdminCompliance />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="attendance" element={<AdminAttendanceList />} />
              <Route path="attendance/:sessionId" element={<AdminAttendanceSession />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Direct Shortcuts & Fallbacks */}
          <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
