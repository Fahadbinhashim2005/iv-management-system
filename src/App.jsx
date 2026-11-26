import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';

// Student Portal
import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/StudentDashboard';
import StudentItinerary from './pages/StudentItinerary';
import StudentAttendance from './features/attendance/pages/StudentAttendance';
import StudentScan from './features/attendance/pages/StudentScan';
import StudentTransport from './pages/StudentTransport';
import StudentAccommodation from './pages/StudentAccommodation';
import StudentAnnouncements from './pages/StudentAnnouncements';
import StudentProfile from './pages/StudentProfile';

// Coordinator Portal (Field Operations & Attendance)
import CoordinatorLayout from './layouts/CoordinatorLayout';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import CoordinatorVisits from './pages/coordinator/CoordinatorVisits';
import CoordinatorItinerary from './pages/coordinator/CoordinatorItinerary';
import CoordinatorParticipants from './pages/coordinator/CoordinatorParticipants';
import CoordinatorAttendanceList from './features/attendance/pages/CoordinatorAttendanceList';
import CoordinatorAttendanceSession from './features/attendance/pages/CoordinatorAttendanceSession';
import CoordinatorTransport from './pages/coordinator/CoordinatorTransport';
import CoordinatorAccommodation from './pages/coordinator/CoordinatorAccommodation';
import CoordinatorAnnouncements from './pages/coordinator/CoordinatorAnnouncements';
import CoordinatorReports from './pages/coordinator/CoordinatorReports';
import ProfilePage from './pages/Profile/ProfilePage';

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

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
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
              <Route path="visits" element={<CoordinatorVisits />} />
              <Route path="itinerary" element={<CoordinatorItinerary />} />
              <Route path="participants" element={<CoordinatorParticipants />} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
