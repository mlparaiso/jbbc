import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// Requires only login (not a team) — used for /team-setup
export default function LoginGuard() {
  const { user, teamId, authLoading, teamLoading } = useApp();

  if (authLoading || (user && teamLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  // Not logged in → go to login page
  if (!user) return <Navigate to="/login" replace />;

  // Already has a team → go straight to the schedule (Year Calendar)
  if (teamId) return <Navigate to="/" replace />;

  return <Outlet />;
}
