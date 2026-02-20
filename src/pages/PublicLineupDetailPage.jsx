import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Music2, Users, LogIn, Lock } from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const ROLE_COLORS = {
  Vocalist: 'bg-purple-100 text-purple-700',
  Keyboard: 'bg-blue-100 text-blue-700',
  Guitar: 'bg-green-100 text-green-700',
  Bass: 'bg-orange-100 text-orange-700',
  Drums: 'bg-red-100 text-red-700',
  Sound: 'bg-gray-100 text-gray-700',
};

export default function PublicLineupDetailPage() {
  const { teamId, lineupId } = useParams();
  const navigate = useNavigate();
  const { loadPublicTeam, publicTeam, publicLineups, publicMembers, publicLoading, publicError } = useApp();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (teamId && !loaded) {
      loadPublicTeam(teamId).then(() => setLoaded(true));
    }
  }, [teamId]);

  if (publicLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-primary-400 text-sm animate-pulse">Loading...</div>
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
        <h2 className="text-xl font-bold text-gray-700 mb-2">Not found</h2>
        <button onClick={() => navigate(`/team/${teamId}`)} className="btn-secondary mt-4">Go back</button>
      </div>
    );
  }

  const lineup = publicLineups.find(l => l.id === lineupId);

  if (loaded && !lineup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <h2 className="text-xl font-bold text-gray-700 mb-2">Lineup not found</h2>
        <button onClick={() => navigate(`/team/${teamId}`)} className="btn-secondary mt-4">Go back</button>
      </div>
    );
  }

  if (!lineup) return null;

  const getMemberName = (id) => {
    const m = publicMembers.find(m => m.id === id);
    return m ? (m.nickname || m.name) : id;
  };

  const songsBySection = {};
  for (const song of lineup.songs || []) {
    if (!songsBySection[song.section]) songsBySection[song.section] = [];
    songsBySection[song.section].push(song);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary-700 text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="text-lg font-bold leading-tight">{publicTeam?.name || 'Worship Team'}</h1>
              <p className="text-xs text-primary-200">Worship Schedule</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogIn size={13} /> Sign in to edit
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Back */}
        <Link to={`/team/${teamId}`} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800">
          <ArrowLeft size={15} /> Back to schedule
        </Link>

        {/* Header card */}
        <div className="card">
          <p className="text-xs text-primary-600 font-semibold mb-1">{formatDate(lineup.date)}</p>
          <h2 className="text-xl font-bold text-gray-800">{lineup.title || 'Worship Service'}</h2>
          {lineup.notes && <p className="text-sm text-gray-500 mt-2">{lineup.notes}</p>}
        </div>

        {/* Lineup / Assignments */}
        {lineup.assignments && Object.keys(lineup.assignments).length > 0 && (
          <div className="card space-y-2">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <Users size={14} /> Team Lineup
            </h3>
            {Object.entries(lineup.assignments).map(([role, memberIds]) => {
              const ids = Array.isArray(memberIds) ? memberIds : [memberIds];
              if (!ids.length || ids.every(id => !id)) return null;
              return (
                <div key={role} className="flex items-start gap-3 py-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'}`}>
                    {role}
                  </span>
                  <span className="text-sm text-gray-700">
                    {ids.filter(Boolean).map(id => getMemberName(id)).join(', ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Songs */}
        {lineup.songs && lineup.songs.length > 0 && (
          <div className="card space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <Music2 size={14} /> Songs
            </h3>
            {Object.entries(songsBySection).map(([section, songs]) => (
              <div key={section}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{section}</p>
                <div className="space-y-1">
                  {songs.map((song, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{song.title}</span>
                      {song.youtubeUrl && (
                        <a
                          href={song.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-red-500 hover:text-red-600 bg-red-50 px-1.5 py-0.5 rounded"
                        >
                          ▶ YT
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
        {publicTeam?.name} © {new Date().getFullYear()} ·{' '}
        <span className="text-primary-500 cursor-pointer hover:underline" onClick={() => navigate('/login')}>
          Sign in to manage
        </span>
      </footer>
    </div>
  );
}
