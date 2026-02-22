import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// Requires only login (not a team) — used for /team-setup
export default function LoginGuard() {
  const { user, authLoading, teamLoading } = useApp();

  // Wait for both auth AND team data before deciding
  if (authLoading || (user && teamLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  // Not logged in → go to login page
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
