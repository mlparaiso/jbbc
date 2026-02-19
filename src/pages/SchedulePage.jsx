import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Mic2, Music4, CalendarCheck, ChevronLeft, ChevronRight,
  CalendarDays, Plus, BookOpen, Quote,
  Piano, Guitar, Waves, Drum, SlidersHorizontal
} from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function InstrumentPill({ icon, name, iconClass = 'text-primary-400' }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded px-1.5 py-0.5 text-xs">
      <span className={iconClass}>{icon}</span>
      {name}
    </span>
  );
}

export default function SchedulePage() {
  const { lineups, isAdmin, getMemberById } = useApp();
  const navigate = useNavigate();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const MIN_YEAR = 2026;
  const MIN_MONTH = 1;
  const atMin = year === MIN_YEAR && month === MIN_MONTH;

  const monthLineups = lineups
    .filter((l) => {
      const d = new Date(l.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Find the next upcoming lineup (closest future date)
  const upcomingLineup = monthLineups.find(l => l.date >= today);

  // Monthly theme and bible verse from the first lineup
  const monthTheme = monthLineups.find(l => l.theme)?.theme || '';
  const monthBibleVerse = monthLineups.find(l => l.bibleVerse)?.bibleVerse || '';

  const prevMonth = () => {
    if (atMin) return;
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className={`p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors ${atMin ? 'opacity-30 cursor-not-allowed' : ''}`}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">{MONTHS[month - 1]} {year}</h2>
          <p className="text-xs text-gray-400">{monthLineups.length} service{monthLineups.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Monthly Theme + Bible Verse */}
      {monthTheme && (
        <div className="mb-4 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpen size={14} className="text-primary-500" />
            <span className="text-xs font-bold text-primary-500 uppercase tracking-wide">Monthly Theme</span>
          </div>
          <p className="text-base font-bold text-primary-800">{monthTheme}</p>
          {monthBibleVerse && (
            <div className="mt-2 pt-2 border-t border-primary-100">
              <div className="flex items-start gap-1.5">
                <Quote size={12} className="text-primary-300 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-primary-600 italic leading-relaxed">{monthBibleVerse}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lineup list */}
      {monthLineups.length > 0 ? (
        <div className="space-y-2">
          {monthLineups.map((lineup) => {
            const isUpcoming = lineup.id === upcomingLineup?.id;
            const wlNames = lineup.worshipLeaders.map(wl => {
              const m = getMemberById(wl.memberId);
              const roleLabel = wl.role && wl.role !== 'Worship Leader' ? ` (${wl.role})` : '';
              return m ? `${m.name}${roleLabel}` : '—';
            }).join(', ');

            const backupNames = lineup.backUps.map(id => getMemberById(id)?.name).filter(Boolean).join(', ');
            const k1 = lineup.instruments.k1?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const k2 = lineup.instruments.k2?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const bass = lineup.instruments.bass?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const lg = lineup.instruments.leadGuitar?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const ag = lineup.instruments.acousticGuitar?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const drums = lineup.instruments.drums?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const se = getMemberById(lineup.soundEngineer);

            return (
              <div key={lineup.id}>
                {/* "UPCOMING" label above the highlighted card */}
                {isUpcoming && (
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">● Upcoming</span>
                  </div>
                )}
                <div
                  onClick={() => navigate(`/lineup/${lineup.id}`)}
                  className={`rounded-xl cursor-pointer transition-all border-l-4 ${
                    isUpcoming
                      ? 'bg-primary-600 text-white border-l-primary-300 shadow-lg ring-2 ring-primary-300'
                      : `bg-white border border-gray-100 hover:shadow-sm hover:border-primary-200 ${lineup.isTeamA ? 'border-l-amber-400' : 'border-l-primary-400'}`
                  }`}
                >
                  {/* Top row: date + Team A badge + arrow */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isUpcoming ? 'text-white' : 'text-gray-800'}`}>
                        {shortDate(lineup.date)}
                      </span>
                      {lineup.isTeamA && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isUpcoming ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                          Team A
                        </span>
                      )}
                    </div>
                    <ChevronRight size={15} className={isUpcoming ? 'text-white/60' : 'text-gray-300'} />
                  </div>

                  {/* WL row */}
                  <div className="flex items-start gap-1.5 px-4 pb-1">
                    <Mic2 size={13} className={`flex-shrink-0 mt-0.5 ${isUpcoming ? 'text-white/70' : 'text-primary-400'}`} />
                    <span className={`text-sm font-medium leading-tight ${isUpcoming ? 'text-white' : 'text-gray-700'}`}>
                      {wlNames || 'TBA'}
                    </span>
                  </div>

                  {/* Backups row */}
                  {backupNames && (
                    <div className="flex items-start gap-1.5 px-4 pb-1">
                      <Music4 size={13} className={`flex-shrink-0 mt-0.5 ${isUpcoming ? 'text-white/50' : 'text-gray-300'}`} />
                      <span className={`text-xs leading-tight ${isUpcoming ? 'text-white/80' : 'text-gray-500'}`}>{backupNames}</span>
                    </div>
                  )}

                  {/* Instruments row */}
                  <div className={`flex flex-wrap gap-1 px-4 pb-2 pt-1 ${isUpcoming ? '[&_span]:bg-white/15 [&_span]:text-white' : ''}`}>
                    {k1 && <InstrumentPill icon={<Piano size={10} />} name={`Keyboard 1: ${k1}`} iconClass={isUpcoming ? 'text-white/70' : 'text-primary-400'} />}
                    {k2 && <InstrumentPill icon={<Piano size={10} />} name={`Keyboard 2: ${k2}`} iconClass={isUpcoming ? 'text-white/70' : 'text-violet-400'} />}
                    {bass && <InstrumentPill icon={<Waves size={10} />} name={`Bass: ${bass}`} iconClass={isUpcoming ? 'text-white/70' : 'text-primary-400'} />}
                    {lg && <InstrumentPill icon={<Guitar size={10} />} name={`Lead Guitar: ${lg}`} iconClass={isUpcoming ? 'text-white/70' : 'text-orange-400'} />}
                    {ag && <InstrumentPill icon={<Guitar size={10} />} name={`Acoustic Guitar: ${ag}`} iconClass={isUpcoming ? 'text-white/70' : 'text-primary-400'} />}
                    {drums && <InstrumentPill icon={<Drum size={10} />} name={`Drums: ${drums}`} iconClass={isUpcoming ? 'text-white/70' : 'text-primary-400'} />}
                    {se && <InstrumentPill icon={<SlidersHorizontal size={10} />} name={`Sound Engineer: ${se.name}`} iconClass={isUpcoming ? 'text-white/70' : 'text-blue-400'} />}
                  </div>

                  {/* Practice date */}
                  {lineup.practiceDate && (
                    <div className="flex items-center gap-1 px-4 pb-2">
                      <CalendarCheck size={11} className={isUpcoming ? 'text-white/50' : 'text-gray-300'} />
                      <span className={`text-xs ${isUpcoming ? 'text-white/70' : 'text-gray-400'}`}>
                        Practice: {shortDate(lineup.practiceDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No lineups for this month yet.</p>
          {isAdmin && (
            <button onClick={() => navigate('/lineup/new')} className="btn-primary mt-4 flex items-center gap-1.5 mx-auto">
              <Plus size={15} /> Create First Lineup
            </button>
          )}
        </div>
      )}

      {/* Admin: Add Lineup Button */}
      {isAdmin && monthLineups.length > 0 && (
        <div className="mt-4 text-center">
          <button onClick={() => navigate('/lineup/new')} className="btn-primary flex items-center gap-1.5 mx-auto text-sm">
            <Plus size={15} /> Add New Lineup
          </button>
        </div>
      )}
    </div>
  );
}
