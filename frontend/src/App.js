import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { VolunteersPage } from '@/pages/VolunteersPage';
import { VolunteerDetailPage } from '@/pages/VolunteerDetailPage';
import { SchedulesPage } from '@/pages/SchedulesPage';
import { ScheduleDetailPage } from '@/pages/ScheduleDetailPage';
import { SongsPage } from '@/pages/SongsPage';
import { ChatPage } from '@/pages/ChatPage';
import { PublicSchedulePage } from '@/pages/PublicSchedulePage';
import { PublicRegisterPage } from '@/pages/PublicRegisterPage';
import { PublicMonthlyPage } from '@/pages/PublicMonthlyPage';
import { Toaster } from 'sonner';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (user?.role === 'Voluntário') return <Navigate to="/schedules" replace />;
  return children;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'Voluntário' ? '/schedules' : '/dashboard'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cadastro-voluntario" element={<PublicRegisterPage />} />
          <Route path="/public/schedule/:token" element={<PublicSchedulePage />} />
          <Route path="/public/mes/:ministry/:yearMonth" element={<PublicMonthlyPage />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />
            <Route path="volunteers" element={<AdminRoute><VolunteersPage /></AdminRoute>} />
            <Route path="volunteers/:id" element={<AdminRoute><VolunteerDetailPage /></AdminRoute>} />
            <Route path="schedules" element={<SchedulesPage />} />
            <Route path="schedules/:id" element={<ScheduleDetailPage />} />
            <Route path="songs" element={<SongsPage />} />
            <Route path="chat" element={<AdminRoute><ChatPage /></AdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
