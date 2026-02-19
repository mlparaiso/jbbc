import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Music2 } from 'lucide-react';

export default function LandingPage() {
  const { user, teamId, authLoading, teamLoading, loginWithGoogle } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || teamLoading) return;
    if (user && teamId) navigate('/', { replace: true });
    else if (user && !teamId) navigate('/team-setup', { replace: true });
  }, [user, teamId, authLoading, teamLoading]);

  if (authLoading || teamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-primary-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-900 flex flex-col items-center justify-center px-4 text-white">
      <div className="max-w-sm w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-3">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto">
            <Music2 size={40} className="text-primary-200" />
          </div>
          <h1 className="text-3xl font-bold">Worship Schedule</h1>
          <p className="text-primary-200 text-sm">Manage your music team's lineup, members, and songs — all in one place.</p>
        </div>

        {/* Sign in */}
        <div className="space-y-4">
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
          <p className="text-xs text-primary-300">
            Sign in to manage your team. New here? You'll create or join a team after signing in.
          </p>
        </div>
      </div>

      <footer className="absolute bottom-4 text-xs text-primary-400">
        Worship Schedule Manager © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
