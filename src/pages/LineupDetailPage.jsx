import { useParams, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateLineupImage } from '../utils/generateLineupImage';
import {
  Mic2, Music4, BookOpen, CalendarCheck,
  Printer, Pencil, Trash2, ChevronLeft, ChevronRight, AlertCircle,
  SlidersHorizontal, Piano, Guitar, Waves, Drum, Youtube, Share2, Loader,
  Music2, AudioLines, Bell, Repeat2
} from 'lucide-react';

// Map icon string names → actual Lucide components (for extra instruments)
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
  { key: 'k1',             icon: <Piano size={14} />,           label: 'Keyboard 1',      iconClass: 'text-primary-500' },
  { key: 'k2',             icon: <Piano size={14} />,           label: 'Keyboard 2',      iconClass: 'text-amber-500' },
  { key: 'bass',           icon: <Waves size={14} />,           label: 'Bass Guitar',     iconClass: 'text-primary-500' },
  { key: 'leadGuitar',     icon: <Guitar size={14} />,          label: 'Lead Guitar',     iconClass: 'text-orange-400' },
  { key: 'acousticGuitar', icon: <Guitar size={14} />,          label: 'Acoustic Guitar', iconClass: 'text-primary-500' },
  { key: 'drums',          icon: <Drum size={14} />,            label: 'Drums',           iconClass: 'text-primary-500' },
];

const SECTION_ORDER = [
  'Opening',
  'Opening/Welcome',
  'Welcome',
  'Praise and Worship',
  "Lord's Table",
  'Special Number',
  'Other',
];

// Group songs by section, sorted by predefined section order
function groupSongs(songs) {
  const map = {};
  for (const song of songs) {
    const sec = song.section || 'Other';
    if (!map[sec]) map[sec] = [];
    map[sec].push(song);
  }
  // Sort sections by SECTION_ORDER, then unknowns at the end
  const sortedSections = Object.keys(map).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a);
    const bi = SECTION_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return sortedSections.map(sec => ({ section: sec, songs: map[sec] }));
}

export default function LineupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getLineupById, getMemberById, isAdmin, canManageLineups, deleteLineup, lineups } = useApp();
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  const lineup = getLineupById(id);

  // Sorted all lineups for prev/next navigation
  const sorted = [...lineups].sort((a, b) => a.date.localeCompare(b.date));
  const currentIndex = sorted.findIndex(l => l.id === id);
  const prevLineup = currentIndex > 0 ? sorted[currentIndex - 1] : null;
  const nextLineup = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

  if (!lineup) {
    return (
      <div className="text-center py-16 text-gray-400">
        <AlertCircle size={48} className="mx-auto mb-3 opacity-40" />
        <p className="text-lg">Lineup not found.</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">Back to Schedule</button>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm('Delete this lineup? This cannot be undone.')) {
      deleteLineup(lineup.id);
      navigate('/');
    }
  };

  const se = getMemberById(lineup.soundEngineer);
  const songs = lineup.songs || [];
  const songGroups = groupSongs(songs);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb + Action buttons row */}
      <div className="flex flex-col gap-2 mb-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm flex-wrap">
          <button
            onClick={() => navigate('/')}
            className="text-primary-600 hover:underline font-medium"
          >
            {new Date(lineup.date + 'T00:00:00').getFullYear()}
          </button>
          <ChevronRight size={14} className="text-gray-400" />
          <button
            onClick={() => {
              const d = new Date(lineup.date + 'T00:00:00');
              navigate(`/?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
            }}
            className="text-primary-600 hover:underline font-medium"
          >
            {new Date(lineup.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long' })}
          </button>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-500">
            {new Date(lineup.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
          </span>
        </nav>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            onClick={async () => {
              if (sharing) return;
              setSharing(true);
              try {
                const url = window.location.href;
                const blob = await generateLineupImage({
                  lineup, getMemberById, songGroups, url,
                  formatDate, shortDate, INSTRUMENT_CONFIG,
                });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `worship-lineup-${lineup.date}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
              } catch (err) {
                console.error('Share error:', err);
                alert('Share failed: ' + (err?.message || String(err)));
              } finally {
                setSharing(false);
              }
            }}
            disabled={sharing}
            className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
          >
            {sharing ? <Loader size={12} className="animate-spin" /> : <Share2 size={12} />} Share
          </button>
          <button onClick={() => window.print()} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
            <Printer size={12} /> Print
          </button>
          {canManageLineups && (
            <>
              <button onClick={() => navigate(`/lineup/${lineup.id}/edit`)} className="btn-primary text-xs py-1 px-2 flex items-center gap-1">
                <Pencil size={12} /> Edit
              </button>
              <button onClick={handleDelete} className="btn-danger text-xs py-1 px-2 flex items-center gap-1">
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Prev / Next week navigation */}
      <div className="flex items-center justify-between mb-3 print:hidden">
        <button
          onClick={() => prevLineup && navigate(`/lineup/${prevLineup.id}`)}
          disabled={!prevLineup}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors ${prevLineup ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
        >
          <ChevronLeft size={14} />
          {prevLineup ? shortDate(prevLineup.date) : 'No prev'}
        </button>
        <span className="text-xs text-gray-400">week {currentIndex + 1} of {sorted.length}</span>
        <button
          onClick={() => nextLineup && navigate(`/lineup/${nextLineup.id}`)}
          disabled={!nextLineup}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors ${nextLineup ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
        >
          {nextLineup ? shortDate(nextLineup.date) : 'No next'}
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Main card */}
      <div ref={cardRef} className="card dark:bg-gray-800 dark:border-gray-700 border-l-4 border-l-primary-400 space-y-4">

        {/* Date + theme + practice date */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatDate(lineup.date)}</h2>
            {lineup.isTeamA && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold px-2 py-0.5 rounded-full">Team A</span>
            )}
          </div>
          {lineup.theme && (
            <p className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-0.5">
              <BookOpen size={11} /> {lineup.theme}
            </p>
          )}
          {/* Prominent practice date badge */}
          {lineup.practiceDate && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg px-3 py-1.5 text-xs font-semibold">
              <CalendarCheck size={13} />
              Practice: {shortDate(lineup.practiceDate)}, after the Service
            </div>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Worship Leaders + Backups */}
        <div className={`grid gap-4 ${lineup.backUps.length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Mic2 size={12} /> Worship Leader{lineup.worshipLeaders.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-1">
              {lineup.worshipLeaders.map((wl, i) => {
                const member = getMemberById(wl.memberId);
                const showRole = wl.role && wl.role !== 'Worship Leader';
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    {showRole && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">{wl.role}</span>
                    )}
                    <span className="text-sm text-gray-800 dark:text-gray-100 font-medium">{member?.name || '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {lineup.backUps.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Music4 size={12} /> Back Ups
              </p>
              <div className="flex flex-wrap gap-1">
                {lineup.backUps.map((bid) => {
                  const member = getMemberById(bid);
                  return (
                    <span key={bid} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                      {member?.name || '—'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Instruments grid */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Instruments</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {INSTRUMENT_CONFIG.map(({ key, icon, label, iconClass }) => {
              const names = (lineup.instruments[key] || [])
                .map(id => getMemberById(id)?.name)
                .filter(Boolean)
                .join(' / ');
              return (
                <div key={key} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                  <span className={`${iconClass} flex-shrink-0`}>{icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 leading-none">{label}</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{names || '—'}</p>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
              <span className="text-blue-400 flex-shrink-0"><SlidersHorizontal size={14} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 leading-none">Sound Engineer</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{se?.name || '—'}</p>
              </div>
            </div>
            {/* Extra instruments */}
            {(lineup.instruments.extras || []).map((extra, ei) => {
              const names = (extra.memberIds || [])
                .map(id => getMemberById(id)?.name)
                .filter(Boolean)
                .join(' / ');
              const icon = EXTRA_ICON_MAP[extra.icon] || EXTRA_ICON_MAP['Music2'];
              return (
                <div key={ei} className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
                  <span className="text-purple-400 flex-shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 leading-none">{extra.label}</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{names || '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Songs Section */}
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
                          <span className="text-sm text-gray-800 dark:text-gray-100 leading-tight">{song.title}</span>
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
                            <a
                              href={song.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 inline-flex items-center gap-0.5 text-xs text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
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

        {/* Legacy plain-text notes fallback */}
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
      <div className="mt-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex gap-2 print:hidden">
        <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-yellow-600" />
        <span><strong>Reminder:</strong> Sit in designated seats | No personal phone use on stage | Be presentable | Do it for the Lord.</span>
      </div>
    </div>
  );
}
