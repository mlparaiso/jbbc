import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Music2 } from 'lucide-react';

export default function AdminLoginPage() {
  const { user, teamId, loginWithGoogle, authLoading, teamLoading } = useApp();
  const navigate = useNavigate();

  if (authLoading || (user && teamLoading)) return null;

  // If already logged in, go to schedule if they have a team, else team setup
  if (user) {
    navigate(teamId ? '/' : '/team-setup', { replace: true });
    return null;
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 py-16">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Music2 size={32} className="text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Admin Sign In</h2>
        <p className="text-sm text-gray-500">Sign in with your Google account to manage your team's worship schedule.</p>
      </div>

      <button
        onClick={loginWithGoogle}
        className="flex items-center gap-3 bg-white border border-gray-300 rounded-xl px-6 py-3 shadow-sm hover:shadow-md hover:border-gray-400 transition-all font-medium text-gray-700"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
        Sign in with Google
      </button>

      <p className="text-xs text-gray-400 max-w-xs text-center">
        First time? You'll be asked to create or join a team after signing in.
      </p>
    </div>
  );
}
