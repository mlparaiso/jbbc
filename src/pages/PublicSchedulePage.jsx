import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CalendarDays, ChevronLeft, ChevronRight, LogIn, Lock, Mic2, BookOpen, Quote, CalendarCheck } from 'lucide-react';
import { Piano, Guitar, Waves, Drum, SlidersHorizontal } from 'lucide-react';
import DonateSection from '../components/DonateSection';

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MIN_YEAR = 2026;

function InstrumentPill({ icon, name, iconClass = 'text-primary-400' }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 text-xs">
      <span className={iconClass}>{icon}</span>
      {name}
    </span>
  );
}

export default function PublicSchedulePage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { loadPublicTeam, publicTeam, publicLineups, publicMembers, publicLoading, publicError } = useApp();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  // null = year view; number = month detail view
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (teamId && !loaded) {
      loadPublicTeam(teamId).then(() => setLoaded(true));
    }
  }, [teamId]);

  // Build count-by-month map for year grid
  const countByMonth = {};
  publicLineups.forEach(l => {
    const d = new Date(l.date + 'T00:00:00');
    if (d.getFullYear() === year) {
      const m = d.getMonth() + 1;
      countByMonth[m] = (countByMonth[m] || 0) + 1;
    }
  });

  const monthLineups = selectedMonth
    ? publicLineups
        .filter(l => {
          const d = new Date(l.date + 'T00:00:00');
          return d.getFullYear() === year && d.getMonth() + 1 === selectedMonth;
        })
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const getMemberName = (id) => {
    const m = publicMembers.find(m => m.id === id);
    return m ? m.name : '';
  };

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
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-primary-500 flex items-center justify-center">
              {publicTeam.logoUrl
                ? <img src={publicTeam.logoUrl} alt="Team logo" className="w-full h-full object-cover" />
                : <img src="/logo.svg" alt="Logo" className="w-5 h-5 object-contain" />
              }
            </div>
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

        {/* ── YEAR GRID VIEW ── */}
        {selectedMonth === null && (
          <>
            {/* Year navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setYear(y => Math.max(MIN_YEAR, y - 1))}
                disabled={year <= MIN_YEAR}
                className={`p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors ${year <= MIN_YEAR ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800">{year}</h2>
                <p className="text-xs text-gray-400">Worship Schedule</p>
              </div>
              <button onClick={() => setYear(y => y + 1)} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-3">
              {MONTHS.map((name, i) => {
                const m = i + 1;
                const count = countByMonth[m] || 0;
                const isCurrentMonth = year === now.getFullYear() && m === now.getMonth() + 1;
                const hasSched = count > 0;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`relative rounded-xl px-2 py-4 sm:px-4 sm:py-5 text-center transition-all border
                      ${isCurrentMonth
                        ? 'bg-primary-600 text-white border-primary-500 shadow-md ring-2 ring-primary-300'
                        : hasSched
                          ? 'bg-white border-primary-200 hover:border-primary-400 hover:shadow-sm text-gray-800'
                          : 'bg-gray-50 border-gray-100 hover:bg-gray-100 text-gray-400'
                      }`}
                  >
                    <p className={`text-xs sm:text-sm font-bold truncate ${isCurrentMonth ? 'text-white' : hasSched ? 'text-gray-800' : 'text-gray-400'}`}>
                      {name}
                    </p>
                    {hasSched ? (
                      <p className={`text-xs mt-1 font-medium ${isCurrentMonth ? 'text-white/80' : 'text-primary-500'}`}>
                        {count}<span className="hidden sm:inline"> service{count !== 1 ? 's' : ''}</span>
                      </p>
                    ) : (
                      <p className="text-xs mt-1 text-gray-300">—</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-600 inline-block"></span> Current month</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-primary-200 inline-block"></span> Has schedule</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 inline-block"></span> No schedule</span>
            </div>
          </>
        )}

        {/* ── MONTH DETAIL VIEW ── */}
        {selectedMonth !== null && (
          <>
            {/* Back + month title */}
            <div className="mb-4">
              <button onClick={() => setSelectedMonth(null)} className="text-primary-600 hover:underline text-sm flex items-center gap-1 mb-3">
                <ChevronLeft size={16} /> All Months
              </button>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (selectedMonth === 1) {
                      if (year > MIN_YEAR) { setYear(y => y - 1); setSelectedMonth(12); }
                    } else {
                      setSelectedMonth(m => m - 1);
                    }
                  }}
                  disabled={selectedMonth === 1 && year <= MIN_YEAR}
                  className={`p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 ${selectedMonth === 1 && year <= MIN_YEAR ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-800">{MONTHS[selectedMonth - 1]} {year}</h2>
                  <p className="text-xs text-gray-400">{monthLineups.length} service{monthLineups.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => {
                    if (selectedMonth === 12) { setYear(y => y + 1); setSelectedMonth(1); }
                    else setSelectedMonth(m => m + 1);
                  }}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Monthly theme */}
            {monthLineups.find(l => l.theme) && (
              <div className="mb-4 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen size={14} className="text-primary-500" />
                  <span className="text-xs font-bold text-primary-500 uppercase tracking-wide">Monthly Theme</span>
                </div>
                <p className="text-base font-bold text-primary-800">{monthLineups.find(l => l.theme).theme}</p>
                {monthLineups.find(l => l.bibleVerse)?.bibleVerse && (
                  <div className="mt-2 pt-2 border-t border-primary-100 flex items-start gap-1.5">
                    <Quote size={12} className="text-primary-300 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-primary-600 italic leading-relaxed">{monthLineups.find(l => l.bibleVerse).bibleVerse}</p>
                  </div>
                )}
              </div>
            )}

            {/* Lineup cards */}
            {monthLineups.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No schedules for {MONTHS[selectedMonth - 1]} {year}.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {monthLineups.map(lineup => {
                  const wlNames = (lineup.worshipLeaders || []).map(wl => {
                    const name = getMemberName(wl.memberId);
                    const roleLabel = wl.role && wl.role !== 'Worship Leader' ? ` (${wl.role})` : '';
                    return name ? `${name}${roleLabel}` : '';
                  }).filter(Boolean).join(', ');
                  const backupNames = (lineup.backUps || []).map(id => getMemberName(id)).filter(Boolean).join(', ');
                  const k1 = (lineup.instruments?.k1 || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const k2 = (lineup.instruments?.k2 || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const bass = (lineup.instruments?.bass || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const lg = (lineup.instruments?.leadGuitar || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const ag = (lineup.instruments?.acousticGuitar || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const drums = (lineup.instruments?.drums || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const seName = getMemberName(lineup.soundEngineer);
                  return (
                    <div
                      key={lineup.id}
                      onClick={() => navigate(`/team/${teamId}/lineup/${lineup.id}`)}
                      className="rounded-xl cursor-pointer transition-all border-l-4 bg-white border border-gray-100 hover:shadow-sm hover:border-primary-200 border-l-primary-400"
                    >
                      <div className="flex items-center justify-between px-4 pt-3 pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-800">{shortDate(lineup.date)}</span>
                          {lineup.isTeamA && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Team A</span>}
                          {lineup.practiceDate && (
                            <span className="text-xs flex items-center gap-0.5 text-teal-600">
                              <CalendarCheck size={10} /> Practice: {shortDate(lineup.practiceDate)}
                            </span>
                          )}
                        </div>
                        <ChevronRight size={15} className="text-gray-300" />
                      </div>
                      <div className="flex items-start gap-1.5 px-4 pb-1">
                        <Mic2 size={13} className="flex-shrink-0 mt-0.5 text-primary-400" />
                        <span className="text-sm font-medium leading-tight text-gray-700">{wlNames || 'TBA'}</span>
                        {backupNames && <span className="text-xs leading-tight mt-0.5 ml-1 text-gray-400">+ {backupNames}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 px-4 pb-2 pt-0.5">
                        {k1 && <InstrumentPill icon={<Piano size={10} />} name={`K1: ${k1}`} iconClass="text-primary-400" />}
                        {k2 && <InstrumentPill icon={<Piano size={10} />} name={`K2: ${k2}`} iconClass="text-amber-500" />}
                        {bass && <InstrumentPill icon={<Waves size={10} />} name={`BG: ${bass}`} iconClass="text-primary-400" />}
                        {lg && <InstrumentPill icon={<Guitar size={10} />} name={`LG: ${lg}`} iconClass="text-orange-400" />}
                        {ag && <InstrumentPill icon={<Guitar size={10} />} name={`AG: ${ag}`} iconClass="text-primary-400" />}
                        {drums && <InstrumentPill icon={<Drum size={10} />} name={`D: ${drums}`} iconClass="text-primary-400" />}
                        {seName && <InstrumentPill icon={<SlidersHorizontal size={10} />} name={`SE: ${seName}`} iconClass="text-blue-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="max-w-2xl mx-auto w-full px-4 pb-6">
        <DonateSection />
        <p className="text-center text-xs text-gray-400 pt-4 mt-2 border-t border-gray-100">
          {publicTeam.name} © {new Date().getFullYear()} ·{' '}
          <span className="text-primary-500 cursor-pointer hover:underline" onClick={() => navigate('/login')}>Sign in to manage</span>
        </p>
      </footer>
    </div>
  );
}
