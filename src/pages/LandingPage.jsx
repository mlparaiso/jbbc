import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Music2 } from 'lucide-react';

export default function LandingPage() {
  const { user, teamId, authLoading, teamLoading, loginWithGoogle, searchPublicTeams, findPublicTeamByCode } = useApp();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => {
    if (authLoading || teamLoading) return;
    if (user && teamId) navigate('/', { replace: true });
    else if (user && !teamId) navigate('/team-setup', { replace: true });
  }, [user, teamId, authLoading, teamLoading]);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchPublicTeams(searchTerm);
      setSearchResults(results);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setCodeError('');
    setCodeLoading(true);
    const team = await findPublicTeamByCode(codeInput);
    setCodeLoading(false);
    if (!team) {
      setCodeError('Team not found or schedule is private.');
      return;
    }
    navigate(`/team/${team.id}`);
  };

  if (authLoading || teamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-primary-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-900 flex flex-col items-center justify-center px-4 text-white">
      <div className="max-w-sm w-full space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 flex items-center justify-center mx-auto">
            <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold">Worship Schedule</h1>
          <p className="text-primary-200 text-sm">View your team's lineup, members, and songs.</p>
        </div>

        {/* View a team's schedule */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white">📅 View a team's schedule</p>

          {/* Search by name */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by team name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/20 text-white placeholder-white/50 border border-white/20 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          {/* Search results */}
          {(searchResults.length > 0 || searching) && (
            <div className="bg-white rounded-lg overflow-hidden shadow-lg">
              {searching && (
                <div className="text-center py-3 text-xs text-gray-400 animate-pulse">Searching...</div>
              )}
              {!searching && searchResults.map(team => (
                <button
                  key={team.id}
                  onClick={() => navigate(`/team/${team.id}`)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-primary-50 transition-colors text-left border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Music2 size={14} className="text-primary-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800">{team.name}</span>
                  </div>
                  <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                </button>
              ))}
              {!searching && searchResults.length === 0 && searchTerm.trim() && (
                <div className="text-center py-3 text-xs text-gray-400">No public teams found.</div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <div className="flex-1 h-px bg-white/20" />
            <span>or enter invite code</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Code entry */}
          <form onSubmit={handleCodeSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="XXXX-XXXX"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              maxLength={9}
              className="flex-1 bg-white/20 text-white placeholder-white/50 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <button
              type="submit"
              disabled={codeLoading || !codeInput.trim()}
              className="bg-white text-primary-700 font-semibold px-3 py-2 rounded-lg text-sm hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              {codeLoading ? '...' : <ArrowRight size={16} />}
            </button>
          </form>
          {codeError && <p className="text-xs text-red-300">{codeError}</p>}
        </div>

        {/* Sign in section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <div className="flex-1 h-px bg-white/20" />
            <span>team admin sign in</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
          <p className="text-xs text-primary-300 text-center">
            Sign in to manage your team. New here? You'll create or join a team after signing in.
          </p>
        </div>
      </div>

      <footer className="absolute bottom-4 text-xs text-primary-400">
        Worship Schedule © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
