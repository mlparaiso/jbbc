import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useState } from 'react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const MIN_YEAR = 2026;

export default function YearCalendarPage() {
  const { lineups } = useApp();
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  // Build a map of month -> lineup count for this year
  const countByMonth = {};
  lineups.forEach(l => {
    const d = new Date(l.date + 'T00:00:00');
    if (d.getFullYear() === year) {
      const m = d.getMonth() + 1;
      countByMonth[m] = (countByMonth[m] || 0) + 1;
    }
  });

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return (
    <div className="max-w-2xl mx-auto">
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
        <button
          onClick={() => setYear(y => y + 1)}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-3">
        {MONTHS.map((name, i) => {
          const m = i + 1;
          const count = countByMonth[m] || 0;
          const isCurrentMonth = year === currentYear && m === currentMonth;
          const hasSched = count > 0;

          return (
            <button
              key={m}
              onClick={() => navigate(`/?year=${year}&month=${m}`)}
              className={`
                relative rounded-xl px-4 py-5 text-center transition-all border
                ${isCurrentMonth
                  ? 'bg-primary-600 text-white border-primary-500 shadow-md ring-2 ring-primary-300'
                  : hasSched
                    ? 'bg-white border-primary-200 hover:border-primary-400 hover:shadow-sm text-gray-800'
                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100 text-gray-400'
                }
              `}
            >
              <p className={`text-sm font-bold ${isCurrentMonth ? 'text-white' : hasSched ? 'text-gray-800' : 'text-gray-400'}`}>
                {name}
              </p>
              {hasSched ? (
                <p className={`text-xs mt-1 font-medium ${isCurrentMonth ? 'text-white/80' : 'text-primary-500'}`}>
                  {count} service{count !== 1 ? 's' : ''}
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
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary-600 inline-block"></span> Current month
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-primary-200 inline-block"></span> Has schedule
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 inline-block"></span> No schedule
        </span>
      </div>
    </div>
  );
}
