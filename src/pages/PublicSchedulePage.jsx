import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CalendarDays, ChevronLeft, ChevronRight, Music2, LogIn, Lock } from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PublicSchedulePage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { loadPublicTeam, publicTeam, publicLineups, publicLoading, publicError } = useApp();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (teamId && !loaded) {
      loadPublicTeam(teamId).then(ok => setLoaded(true));
    }
  }, [teamId]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const monthLineups = publicLineups.filter(l => {
    const d = new Date(l.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  if (publicLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-primary-400 text-sm animate-pulse">Loading schedule...</div>
      </div>
    );
  }

  if (publicError === 'private') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <Lock size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">This schedule is private</h2>
        <p className="text-sm text-gray-400 mb-6">The team has restricted access to their schedule.</p>
        <button onClick={() => navigate('/login')} className="btn-primary flex items-center gap-2">
          <LogIn size={15} /> Sign in to access
        </button>
      </div>
    );
  }

  if (publicError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <h2 className="text-xl font-bold text-gray-700 mb-2">Team not found</h2>
        <p className="text-sm text-gray-400 mb-6">{publicError}</p>
        <button onClick={() => navigate('/login')} className="btn-secondary">Go back</button>
      </div>
    );
  }

  if (!publicTeam) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary-700 text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight truncate">{publicTeam.name}</h1>
              <p className="text-xs text-primary-200 hidden sm:block">Worship Schedule</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
          >
            <LogIn size={13} /> Sign in
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-800">{MONTHS[month - 1]} {year}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Lineups */}
        {monthLineups.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No schedules for {MONTHS[month - 1]} {year}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthLineups.map(lineup => (
              <Link
                key={lineup.id}
                to={`/team/${teamId}/lineup/${lineup.id}`}
                className="card block hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-primary-600 font-semibold mb-0.5">{formatDate(lineup.date)}</p>
                    <p className="font-semibold text-gray-800 truncate">{lineup.title || 'Worship Service'}</p>
                    {lineup.songs && lineup.songs.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Music2 size={11} />
                        <span>{lineup.songs.length} song{lineup.songs.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
        {publicTeam.name} © {new Date().getFullYear()} · <span className="text-primary-500 cursor-pointer hover:underline" onClick={() => navigate('/login')}>Sign in to manage</span>
      </footer>
    </div>
  );
}
