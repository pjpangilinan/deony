import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-sm">
          <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
            progress_activity
          </span>
          <span className="font-caption text-xs text-secondary tracking-widest uppercase">
            Loading Sanctuary...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};
