import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, LogIn, Lock, Mic2, Music4, BookOpen, CalendarCheck, SlidersHorizontal, Piano, Guitar, Waves, Drum, Youtube, AlertCircle, ChevronLeft, ChevronRight, Music2, AudioLines, Bell, Repeat2 } from 'lucide-react';
import DonateSection from '../components/DonateSection';

const EXTRA_ICON_MAP = {
  Music2: <Music2 size={14} />,
  AudioLines: <AudioLines size={14} />,
  Drum: <Drum size={14} />,
  Bell: <Bell size={14} />,
  Guitar: <Guitar size={14} />,
  Piano: <Piano size={14} />,
  Repeat2: <Repeat2 size={14} />,
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

const INSTRUMENT_CONFIG = [
  { key: 'k1',             icon: <Piano size={14} />,  label: 'Keyboard 1',      iconClass: 'text-primary-500' },
  { key: 'k2',             icon: <Piano size={14} />,  label: 'Keyboard 2',      iconClass: 'text-amber-500' },
  { key: 'bass',           icon: <Waves size={14} />,  label: 'Bass Guitar',     iconClass: 'text-primary-500' },
  { key: 'leadGuitar',     icon: <Guitar size={14} />, label: 'Lead Guitar',     iconClass: 'text-orange-400' },
  { key: 'acousticGuitar', icon: <Guitar size={14} />, label: 'Acoustic Guitar', iconClass: 'text-primary-500' },
  { key: 'drums',          icon: <Drum size={14} />,   label: 'Drums',           iconClass: 'text-primary-500' },
];

const SECTION_ORDER = ['Opening','Opening/Welcome','Welcome','Praise and Worship',"Lord's Table",'Special Number','Other'];

function groupSongs(songs) {
  const map = {};
  for (const song of songs) {
    const sec = song.section || 'Other';
    if (!map[sec]) map[sec] = [];
    map[sec].push(song);
  }
  const sorted = Object.keys(map).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a); const bi = SECTION_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return sorted.map(sec => ({ section: sec, songs: map[sec] }));
}

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

  const getMember = (id) => publicMembers.find(m => m.id === id);
  const getMemberName = (id) => { const m = getMember(id); return m ? m.name : '—'; };
  const se = getMember(lineup.soundEngineer);
  const songs = lineup.songs || [];
  const songGroups = groupSongs(songs);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary-700 text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-primary-500 flex items-center justify-center">
              {publicTeam?.logoUrl
                ? <img src={publicTeam.logoUrl} alt="Team logo" className="w-full h-full object-cover" />
                : <img src="/logo.svg" alt="Logo" className="w-5 h-5 object-contain" />
              }
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight truncate">{publicTeam?.name || 'Worship Team'}</h1>
              <p className="text-xs text-primary-200 hidden sm:block">Worship Schedule</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
          >
            <LogIn size={13} /> <span className="hidden xs:inline">Sign in to edit</span><span className="xs:hidden">Sign in</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Back */}
        <Link to={`/team/${teamId}`} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800">
          <ArrowLeft size={15} /> Back to schedule
        </Link>

        {/* Main detail card — same layout as logged-in LineupDetailPage */}
        <div className="card border-l-4 border-l-primary-400 space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800">{formatDate(lineup.date)}</h2>
              {lineup.isTeamA && <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Team A</span>}
            </div>
            {lineup.theme && (
              <p className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-0.5">
                <BookOpen size={11} /> {lineup.theme}
              </p>
            )}
            {lineup.practiceDate && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg px-3 py-1.5 text-xs font-semibold">
                <CalendarCheck size={13} /> Practice: {shortDate(lineup.practiceDate)}, after the Service
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Worship Leaders + Backups */}
          <div className={`grid gap-4 ${(lineup.backUps || []).length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Mic2 size={12} /> Worship Leader{(lineup.worshipLeaders || []).length > 1 ? 's' : ''}
              </p>
              <div className="space-y-1">
                {(lineup.worshipLeaders || []).map((wl, i) => {
                  const showRole = wl.role && wl.role !== 'Worship Leader';
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      {showRole && <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">{wl.role}</span>}
                      <span className="text-sm text-gray-800 font-medium">{getMemberName(wl.memberId)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {(lineup.backUps || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                  <Music4 size={12} /> Back Ups
                </p>
                <div className="flex flex-wrap gap-1">
                  {lineup.backUps.map(bid => (
                    <span key={bid} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">{getMemberName(bid)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Instruments */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Instruments</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {INSTRUMENT_CONFIG.map(({ key, icon, label, iconClass }) => {
                const names = ((lineup.instruments || {})[key] || []).map(id => getMemberName(id)).filter(n => n !== '—').join(' / ') || '—';
                return (
                  <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className={`${iconClass} flex-shrink-0`}>{icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 leading-none">{label}</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{names}</p>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-blue-400 flex-shrink-0"><SlidersHorizontal size={14} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 leading-none">Sound Engineer</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{se?.name || '—'}</p>
                </div>
              </div>
              {/* Extra instruments */}
              {((lineup.instruments || {}).extras || []).map((extra, ei) => {
                const names = (extra.memberIds || []).map(id => getMemberName(id)).filter(n => n !== '—').join(' / ') || '—';
                const icon = EXTRA_ICON_MAP[extra.icon] || EXTRA_ICON_MAP['Music2'];
                return (
                  <div key={ei} className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
                    <span className="text-purple-400 flex-shrink-0">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 leading-none">{extra.label}</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{names}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Songs */}
          {songGroups.length > 0 && (
            <>
              <hr className="border-gray-100" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                  <BookOpen size={12} /> Songs
                </p>
                <div className="space-y-3">
                  {songGroups.map((group, gi) => (
                    <div key={gi}>
                      <p className="text-xs font-bold text-primary-500 uppercase tracking-wide mb-1">{group.section}</p>
                      <div className="space-y-1">
                        {group.songs.map((song, si) => (
                          <div key={si} className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm text-gray-800 leading-tight">{song.title}</span>
                            {song.key && (
                              <span className="flex-shrink-0 inline-flex items-center text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-1.5 py-0.5 rounded">
                                {song.key}
                              </span>
                            )}
                            {(song.capo !== undefined && song.capo !== '' && song.capo !== null && Number(song.capo) > 0) && (
                              <span className="flex-shrink-0 inline-flex items-center text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                Capo {song.capo}
                              </span>
                            )}
                            {song.youtubeUrl && (
                              <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer"
                                className="flex-shrink-0 inline-flex items-center gap-0.5 text-xs text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-colors">
                                <Youtube size={11} /> YT
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {lineup.notes && (
            <>
              <hr className="border-gray-100" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                  <BookOpen size={12} /> Notes
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{lineup.notes}</p>
              </div>
            </>
          )}

          {/* Next WL */}
          {lineup.nextWL && (
            <>
              <hr className="border-gray-100" />
              <div className="flex items-center gap-2">
                <Mic2 size={13} className="text-primary-400" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Next WL:</span>
                <span className="text-sm font-semibold text-primary-700">{lineup.nextWL}</span>
              </div>
            </>
          )}
        </div>

        {/* Reminder */}
        <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex gap-2">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-yellow-600" />
          <span><strong>Reminder:</strong> Sit in designated seats | No personal phone use on stage | Be presentable | Do it for the Lord.</span>
        </div>
      </main>

      <footer className="max-w-2xl mx-auto w-full px-4 pb-6">
        <DonateSection />
        <p className="text-center text-xs text-gray-400 pt-4 mt-2 border-t border-gray-100">
          {publicTeam?.name} © {new Date().getFullYear()} ·{' '}
          <span className="text-primary-500 cursor-pointer hover:underline" onClick={() => navigate('/login')}>Sign in to manage</span>
        </p>
      </footer>
    </div>
  );
}
