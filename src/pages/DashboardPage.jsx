import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Mic2,
  SlidersHorizontal,
  Music2,
  Drum,
  Piano,
  Waves,
  ChevronRight,
  Lock,
} from 'lucide-react';

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getAlerts(lineup) {
  const alerts = [];

  // 1. Missing worship leader
  const hasWL =
    lineup.worshipLeaders &&
    lineup.worshipLeaders.length > 0 &&
    lineup.worshipLeaders.some((wl) => wl.memberId && wl.memberId.trim() !== '');
  if (!hasWL) alerts.push('Missing WL');

  // 2. Missing sound engineer
  if (!lineup.soundEngineer || lineup.soundEngineer.trim() === '') {
    alerts.push('Missing SE');
  }

  // 3. No songs added
  if (!lineup.songs || lineup.songs.length === 0) {
    alerts.push('No songs');
  }

  // 4. No practice date
  if (!lineup.practiceDate || lineup.practiceDate.trim() === '') {
    alerts.push('No practice date');
  }

  // 5. Incomplete band — require k1, bass, drums (nested under lineup.instruments)
  const coreRoles = ['k1', 'bass', 'drums'];
  const missingCore = coreRoles.some(
    (role) => !lineup.instruments?.[role] || lineup.instruments[role].length === 0
  );
  if (missingCore) alerts.push('Incomplete band');

  return alerts;
}

const ALERT_STYLES = {
  'Missing WL':       { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',     icon: <Mic2 size={11} /> },
  'Missing SE':       { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: <SlidersHorizontal size={11} /> },
  'No songs':         { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <Music2 size={11} /> },
  'No practice date': { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <CalendarDays size={11} /> },
  'Incomplete band':  { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',  icon: <Drum size={11} /> },
};

function AlertPill({ label }) {
  const style = ALERT_STYLES[label] || { color: 'bg-gray-100 text-gray-600', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${style.color}`}>
      {style.icon}
      {label}
    </span>
  );
}

function SummaryCard({ label, value, sub, colorClass }) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${colorClass || 'text-gray-800 dark:text-gray-100'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { lineups, getMemberById, canManageLineups } = useApp();
  const navigate = useNavigate();

  // Access guard
  if (!canManageLineups) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Lock size={40} className="text-gray-300 dark:text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Access Restricted</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          The Dashboard is only available to admins and co-admins.
        </p>
        <button className="btn-secondary mt-2" onClick={() => navigate('/')}>
          Back to Calendar
        </button>
      </div>
    );
  }

  const today = getTodayStr();

  // Only upcoming lineups (today or future), sorted ascending
  const upcoming = [...lineups]
    .filter((l) => l.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute alerts per lineup
  const lineupAlerts = upcoming.map((l) => ({ lineup: l, alerts: getAlerts(l) }));

  const withIssues = lineupAlerts.filter((la) => la.alerts.length > 0);
  const totalAlerts = withIssues.reduce((sum, la) => sum + la.alerts.length, 0);
  const nextService = upcoming[0]?.date ?? null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <LayoutDashboard size={28} className="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming lineup issues and quick actions</p>
        </div>
      </div>

      {/* Summary badges row */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium border border-primary-100 dark:border-primary-800">
          <CalendarDays size={12} />
          {upcoming.length} upcoming service{upcoming.length !== 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium border border-orange-100 dark:border-orange-800">
          <AlertTriangle size={12} />
          {withIssues.length} with issues
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium border border-red-100 dark:border-red-800">
          <AlertTriangle size={12} />
          {totalAlerts} total alert{totalAlerts !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Upcoming Services"
          value={upcoming.length}
          colorClass="text-primary-600 dark:text-primary-400"
        />
        <SummaryCard
          label="Services With Issues"
          value={withIssues.length}
          colorClass={withIssues.length > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}
        />
        <SummaryCard
          label="Total Alerts"
          value={totalAlerts}
          colorClass={totalAlerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
        />
        <SummaryCard
          label="Next Service"
          value={nextService ? formatShortDate(nextService) : '—'}
          colorClass="text-gray-700 dark:text-gray-200"
        />
      </div>

      {/* Alerts list */}
      {withIssues.length === 0 ? (
        /* Empty state */
        <div className="card flex flex-col items-center justify-center py-14 gap-3 text-center">
          <CheckCircle2 size={40} className="text-green-400 dark:text-green-500" />
          <p className="text-base font-semibold text-gray-700 dark:text-gray-200">All upcoming services look complete.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">No issues detected for any upcoming lineup.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-orange-500" />
            Lineups Needing Attention
          </h2>

          {withIssues.map(({ lineup, alerts }) => {
            // Resolve worship leader names
            const wlNames =
              lineup.worshipLeaders && lineup.worshipLeaders.length > 0
                ? lineup.worshipLeaders
                    .map((wl) => {
                      if (!wl.memberId) return null;
                      const m = getMemberById(wl.memberId);
                      return m ? m.name : null;
                    })
                    .filter(Boolean)
                : [];

            return (
              <div key={lineup.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Left: date + WL */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays size={14} className="text-primary-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {formatShortDate(lineup.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Mic2 size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {wlNames.length > 0 ? wlNames.join(', ') : 'No worship leader yet'}
                    </span>
                  </div>
                  {/* Alert pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {alerts.map((a) => (
                      <AlertPill key={a} label={a} />
                    ))}
                  </div>
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    className="btn-secondary text-xs px-3 py-1.5"
                    onClick={() => navigate(`/lineup/${lineup.id}`)}
                  >
                    View
                  </button>
                  <button
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                    onClick={() => navigate(`/lineup/${lineup.id}/edit`)}
                  >
                    Edit Lineup
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
