import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
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
import { Toaster } from 'sonner';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="volunteers" element={<VolunteersPage />} />
            <Route path="volunteers/:id" element={<VolunteerDetailPage />} />
            <Route path="schedules" element={<SchedulesPage />} />
            <Route path="schedules/:id" element={<ScheduleDetailPage />} />
            <Route path="songs" element={<SongsPage />} />
            <Route path="chat" element={<ChatPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
