import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Mic2, Music4, BookOpen, CalendarCheck,
  Printer, Pencil, Trash2, ChevronLeft, AlertCircle,
  SlidersHorizontal, Piano, Guitar, Waves, Drum
} from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Icon + short label for each instrument slot
const INSTRUMENT_CONFIG = [
  { key: 'k1',           icon: <Piano size={14} />,          label: 'K1' },
  { key: 'k2',           icon: <Piano size={14} />,          label: 'K2' },
  { key: 'bass',         icon: <Waves size={14} />,          label: 'Bass' },
  { key: 'leadGuitar',   icon: <Guitar size={14} />,         label: 'LG' },
  { key: 'acousticGuitar', icon: <Guitar size={14} />,       label: 'AG' },
  { key: 'drums',        icon: <Drum size={14} />,           label: 'Drums' },
];

export default function LineupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getLineupById, getMemberById, isAdmin, deleteLineup } = useApp();

  const lineup = getLineupById(id);

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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back + Action buttons row */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate('/')} className="text-primary-600 hover:underline text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Schedule
        </button>
        <div className="flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
            <Printer size={12} /> Print
          </button>
          {isAdmin && (
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

      {/* Main card — everything in one compact panel */}
      <div className={`card border-l-4 ${lineup.isTeamA ? 'border-l-amber-400' : 'border-l-primary-400'} space-y-4`}>

        {/* Date + theme */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-800">{formatDate(lineup.date)}</h2>
            {lineup.isTeamA && (
              <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">Team A</span>
            )}
          </div>
          {lineup.theme && (
            <p className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-0.5">
              <BookOpen size={11} /> {lineup.theme}
            </p>
          )}
          {lineup.practiceDate && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <CalendarCheck size={11} /> Practice: {formatDate(lineup.practiceDate)}
            </p>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Worship Leaders + Backups side by side */}
        <div className="grid grid-cols-2 gap-4">
          {/* WL */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Mic2 size={12} /> Worship Leader{lineup.worshipLeaders.length > 1 ? 's' : ''}
            </p>
            {lineup.isTeamA ? (
              <div className="space-y-1">
                {lineup.worshipLeaders.map((wl, i) => {
                  const member = getMemberById(wl.memberId);
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">{wl.role}</span>
                      <span className="text-sm text-gray-800 font-medium">{member?.name || '—'}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {lineup.worshipLeaders.map((wl, i) => {
                  const member = getMemberById(wl.memberId);
                  return (
                    <span key={i} className="bg-primary-100 text-primary-800 font-semibold px-2 py-0.5 rounded-full text-sm">
                      {member?.name || '—'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Backups */}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INSTRUMENT_CONFIG.map(({ key, icon, label }) => {
              const names = (lineup.instruments[key] || [])
                .map(id => getMemberById(id)?.name)
                .filter(Boolean)
                .join(' / ');
              return (
                <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-primary-500 flex-shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 leading-none">{label}</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{names || '—'}</p>
                  </div>
                </div>
              );
            })}

            {/* Sound Engineer in the same grid */}
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
              <span className="text-blue-400 flex-shrink-0"><SlidersHorizontal size={14} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 leading-none">SE</p>
                <p className="text-sm font-medium text-gray-800 truncate">{se?.name || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {lineup.notes && (
          <>
            <hr className="border-gray-100" />
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <BookOpen size={12} /> Notes / Songs
              </p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{lineup.notes}</p>
            </div>
          </>
        )}
      </div>

      {/* Reminder */}
      <div className="mt-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex gap-2">
        <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-yellow-600" />
        <span><strong>Reminder:</strong> Sit in designated seats | No personal phone use on stage | Be presentable | Do it for the Lord.</span>
      </div>
    </div>
  );
}
