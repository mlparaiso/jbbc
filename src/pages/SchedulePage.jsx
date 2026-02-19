import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Mic2, Music4, CalendarCheck, ChevronLeft, ChevronRight,
  CalendarDays, Plus, ChevronRight as ArrowRight,
  Piano, Guitar, Waves, Drum, SlidersHorizontal, BookOpen
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

      {/* Monthly theme */}
      {monthLineups.length > 0 && monthLineups[0].theme && (
        <div className="mb-3 px-3 py-1.5 bg-primary-50 border border-primary-100 rounded-lg text-xs text-primary-700 flex items-center gap-1.5">
          <BookOpen size={12} />
          <span className="font-semibold">Theme:</span> {monthLineups[0].theme}
        </div>
      )}

      {/* Next WL banner — show from the most recent past lineup's nextWL */}
      {(() => {
        const today = new Date().toISOString().slice(0, 10);
        // Find the last lineup that has already passed (or today) with a nextWL set
        const withNextWL = [...monthLineups]
          .reverse()
          .find(l => l.nextWL && l.date <= today);
        if (!withNextWL) return null;
        return (
          <div className="mb-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
              <Mic2 size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Next Worship Leader</p>
              <p className="text-base font-bold text-amber-900">{withNextWL.nextWL}</p>
            </div>
          </div>
        );
      })()}

      {/* Lineup list */}
      {monthLineups.length > 0 ? (
        <div className="space-y-2">
          {monthLineups.map((lineup) => {
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
              <div
                key={lineup.id}
                onClick={() => navigate(`/lineup/${lineup.id}`)}
                className={`bg-white border border-gray-100 rounded-xl cursor-pointer hover:shadow-sm hover:border-primary-200 transition-all border-l-4 ${
                  lineup.isTeamA ? 'border-l-amber-400' : 'border-l-primary-400'
                }`}
              >
                {/* Top row: date + Team A badge + arrow */}
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">{shortDate(lineup.date)}</span>
                    {lineup.isTeamA && (
                      <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded-full">Team A</span>
                    )}
                  </div>
                  <ChevronRight size={15} className="text-gray-300" />
                </div>

                {/* WL row */}
                <div className="flex items-start gap-1.5 px-4 pb-1">
                  <Mic2 size={13} className="text-primary-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 font-medium leading-tight">{wlNames || 'TBA'}</span>
                </div>

                {/* Backups row */}
                {backupNames && (
                  <div className="flex items-start gap-1.5 px-4 pb-1">
                    <Music4 size={13} className="text-gray-300 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-500 leading-tight">{backupNames}</span>
                  </div>
                )}

                {/* Instruments row */}
                <div className="flex flex-wrap gap-1 px-4 pb-2 pt-1">
                  {k1 && <InstrumentPill icon={<Piano size={10} />} name={`Keyboard 1: ${k1}`} iconClass="text-primary-400" />}
                  {k2 && <InstrumentPill icon={<Piano size={10} />} name={`Keyboard 2: ${k2}`} iconClass="text-violet-400" />}
                  {bass && <InstrumentPill icon={<Waves size={10} />} name={`Bass: ${bass}`} iconClass="text-primary-400" />}
                  {lg && <InstrumentPill icon={<Guitar size={10} />} name={`Lead Guitar: ${lg}`} iconClass="text-orange-400" />}
                  {ag && <InstrumentPill icon={<Guitar size={10} />} name={`Acoustic Guitar: ${ag}`} iconClass="text-primary-400" />}
                  {drums && <InstrumentPill icon={<Drum size={10} />} name={`Drums: ${drums}`} iconClass="text-primary-400" />}
                  {se && <InstrumentPill icon={<SlidersHorizontal size={10} />} name={`SE: ${se.name}`} iconClass="text-blue-400" />}
                </div>

                {/* Practice date */}
                {lineup.practiceDate && (
                  <div className="flex items-center gap-1 px-4 pb-2">
                    <CalendarCheck size={11} className="text-gray-300" />
                    <span className="text-xs text-gray-400">Practice: {shortDate(lineup.practiceDate)}</span>
                  </div>
                )}
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
