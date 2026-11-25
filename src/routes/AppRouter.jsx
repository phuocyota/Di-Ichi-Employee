import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout.jsx'
import { LoginPage } from '../pages/Login/LoginPage.jsx'
import { DashboardPage } from '../pages/Dashboard/DashboardPage.jsx'
import { PotentialCandidatesPage } from '../pages/PotentialCandidates/PotentialCandidatesPage.jsx'
import { AppointmentsPage } from '../pages/Appointments/AppointmentsPage.jsx'
import { CoursesPage } from '../pages/Courses/CoursesPage.jsx'
import { EnrollmentPage } from '../pages/Enrollment/EnrollmentPage.jsx'
import { ClassesPage } from '../pages/Classes/ClassesPage.jsx'
import { PlacementTestsPage } from '../pages/PlacementTests/PlacementTestsPage.jsx'
import { ProfilePage } from '../pages/Profile/ProfilePage.jsx'
import { AttendancePage } from '../pages/Attendance/AttendancePage.jsx'
import { WorkSchedulePage } from '../pages/WorkSchedule/WorkSchedulePage.jsx'
import { StudentsPage } from '../pages/Students/StudentsPage.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/cham-cong', element: <AttendancePage /> },
      { path: '/lich-lam-viec', element: <WorkSchedulePage /> },
      { path: '/ung-vien-tiem-nang', element: <PotentialCandidatesPage /> },
      { path: '/crm-khach-hang', element: <Navigate to="/ung-vien-tiem-nang" replace /> },
      { path: '/lich-goi', element: <Navigate to="/ung-vien-tiem-nang" replace /> },
      { path: '/lich-hen', element: <AppointmentsPage /> },
      { path: '/khoa-hoc', element: <CoursesPage /> },
      { path: '/dang-ky-khoa-hoc', element: <EnrollmentPage /> },
      { path: '/lop-hoc', element: <ClassesPage /> },
      { path: '/hoc-vien', element: <StudentsPage /> },
      { path: '/kiem-tra-dau-vao', element: <PlacementTestsPage /> },
      { path: '/ho-so-ca-nhan', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
