import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Mic2, Music4, CalendarCheck, ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function SchedulePage() {
  const { lineups, isAdmin, getMemberById } = useApp();
  const navigate = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthLineups = lineups
    .filter((l) => {
      const d = new Date(l.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const MIN_YEAR = 2026;
  const MIN_MONTH = 1;

  const prevMonth = () => {
    if (year === MIN_YEAR && month === MIN_MONTH) return; // don't go before Jan 2026
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className={`btn-secondary px-3 py-1 ${year === MIN_YEAR && month === MIN_MONTH ? 'opacity-30 cursor-not-allowed' : ''}`}><ChevronLeft size={18} /></button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">{MONTHS[month - 1]} {year}</h2>
          <p className="text-sm text-gray-500">{monthLineups.length} service{monthLineups.length !== 1 ? 's' : ''} scheduled</p>
        </div>
          <button onClick={nextMonth} className="btn-secondary px-3 py-1"><ChevronRight size={18} /></button>
      </div>

      {/* Monthly theme if present */}
      {monthLineups.length > 0 && monthLineups[0].theme && (
        <div className="mb-4 px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700">
          <span className="font-semibold">Theme:</span> {monthLineups[0].theme}
        </div>
      )}

      {/* Summary Table */}
      {monthLineups.length > 0 ? (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary-700 text-white text-left">
                <th className="px-3 py-2 rounded-tl-lg">Date</th>
                <th className="px-3 py-2">Worship Leader</th>
                <th className="px-3 py-2">Back Ups</th>
                <th className="px-3 py-2">Key Instruments</th>
                <th className="px-3 py-2 rounded-tr-lg">SE</th>
              </tr>
            </thead>
            <tbody>
              {monthLineups.map((lineup, i) => {
                const wlNames = lineup.worshipLeaders.map(wl => {
                  const m = getMemberById(wl.memberId);
                  return m ? m.name : '—';
                }).join(', ');

                const backupNames = lineup.backUps.slice(0, 3).map(id => {
                  const m = getMemberById(id);
                  return m ? m.name : '—';
                });
                if (lineup.backUps.length > 3) backupNames.push(`+${lineup.backUps.length - 3}`);

                const se = getMemberById(lineup.soundEngineer);
                const k1 = lineup.instruments.k1?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
                const drums = lineup.instruments.drums?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';

                return (
                  <tr
                    key={lineup.id}
                    onClick={() => navigate(`/lineup/${lineup.id}`)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-primary-50 transition-colors ${
                      lineup.isTeamA ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {shortDate(lineup.date)}
                      {lineup.isTeamA && <span className="ml-1 text-xs bg-amber-400 text-amber-900 px-1 rounded">A</span>}
                    </td>
                    <td className="px-3 py-2">{wlNames || 'TBA'}</td>
                    <td className="px-3 py-2 text-gray-600">{backupNames.join(', ') || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">K1: {k1} · D: {drums}</td>
                    <td className="px-3 py-2 text-gray-600">{se?.name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <CalendarDays size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No lineups for this month yet.</p>
          {isAdmin && (
            <button onClick={() => navigate('/lineup/new')} className="btn-primary mt-4 flex items-center gap-1.5 mx-auto">
              <Plus size={16} /> Create First Lineup
            </button>
          )}
        </div>
      )}

      {/* Lineup Cards */}
      <div className="space-y-3">
        {monthLineups.map((lineup) => {
          const wlNames = lineup.worshipLeaders.map(wl => {
            const m = getMemberById(wl.memberId);
            const roleLabel = wl.role && wl.role !== 'Worship Leader' ? ` (${wl.role})` : '';
            return m ? `${m.name}${roleLabel}` : '—';
          }).join(', ');

          const backupNames = lineup.backUps.map(id => getMemberById(id)?.name).filter(Boolean).join(', ');

          return (
            <div
              key={lineup.id}
              onClick={() => navigate(`/lineup/${lineup.id}`)}
              className={`card cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                lineup.isTeamA ? 'border-l-amber-400' : 'border-l-primary-400'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800">{formatDate(lineup.date)}</span>
                    {lineup.isTeamA && (
                      <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">Team A</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 flex items-center gap-1">
                    <Mic2 size={14} className="text-primary-500 flex-shrink-0" />
                    <span className="font-medium">WL:</span> {wlNames || 'TBA'}
                  </p>
                  {backupNames && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Music4 size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="font-medium">Backups:</span> {backupNames}
                    </p>
                  )}
                  {lineup.practiceDate && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <CalendarCheck size={12} className="flex-shrink-0" />
                      Practice: {formatDate(lineup.practiceDate)}
                    </p>
                  )}
                </div>
                <span className="text-gray-300 text-xl flex-shrink-0">›</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin: Add Lineup Button */}
      {isAdmin && monthLineups.length > 0 && (
        <div className="mt-6 text-center">
          <button onClick={() => navigate('/lineup/new')} className="btn-primary flex items-center gap-1.5 mx-auto">
            <Plus size={16} /> Add New Lineup
          </button>
        </div>
      )}
    </div>
  );
}
