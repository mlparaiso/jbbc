import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function AuthGuard() {
  const { user, teamId, authLoading, teamLoading } = useApp();

  if (authLoading || teamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  // Not logged in → landing page
  if (!user) return <Navigate to="/login" replace />;

  // Logged in but no team → team setup
  if (!teamId) return <Navigate to="/team-setup" replace />;

  return <Outlet />;
}
