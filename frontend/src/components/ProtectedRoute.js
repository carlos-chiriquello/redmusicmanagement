import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white" data-testid="loading-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4b5563] font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
