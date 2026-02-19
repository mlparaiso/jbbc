import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { INSTRUMENT_ROLES } from '../data/initialData';
import {
  Mic2, Music4, Guitar, SlidersHorizontal, BookOpen, CalendarCheck,
  Printer, Pencil, Trash2, ChevronLeft, AlertCircle
} from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function RoleRow({ label, memberIds, getMemberById }) {
  const names = (memberIds || []).map(id => getMemberById(id)?.name).filter(Boolean);
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 px-3 text-sm font-semibold text-gray-600 whitespace-nowrap w-36">{label}</td>
      <td className="py-2 px-3 text-sm text-gray-800">
        {names.length > 0 ? names.join(' / ') : <span className="text-gray-400">—</span>}
      </td>
    </tr>
  );
}

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

  const handlePrint = () => window.print();

  const se = getMemberById(lineup.soundEngineer);

  return (
    <div>
      {/* Back button */}
      <button onClick={() => navigate('/')} className="text-primary-600 hover:underline text-sm mb-4 flex items-center gap-1">
        <ChevronLeft size={16} /> Back to Schedule
      </button>

      {/* Header */}
      <div className={`card mb-4 border-l-4 ${lineup.isTeamA ? 'border-l-amber-400' : 'border-l-primary-400'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-800">{formatDate(lineup.date)}</h2>
              {lineup.isTeamA && (
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">Team A Sunday</span>
              )}
            </div>
            {lineup.theme && (
              <p className="text-sm text-primary-600 font-medium flex items-center gap-1">
                <BookOpen size={13} /> Theme: {lineup.theme}
              </p>
            )}
            {lineup.practiceDate && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <CalendarCheck size={12} /> Practice Date: {formatDate(lineup.practiceDate)}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0 print:hidden">
            <button onClick={handlePrint} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
              <Printer size={13} /> Print
            </button>
            {isAdmin && (
              <>
                <button onClick={() => navigate(`/lineup/${lineup.id}/edit`)} className="btn-primary text-xs py-1 px-3 flex items-center gap-1">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={handleDelete} className="btn-danger text-xs py-1 px-3 flex items-center gap-1">
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Worship Leaders */}
      <div className="card mb-4">
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Mic2 size={16} className="text-primary-500" />
          <span>Worship Leader{lineup.worshipLeaders.length > 1 ? 's' : ''}</span>
        </h3>
        {lineup.isTeamA ? (
          <div className="space-y-2">
            {lineup.worshipLeaders.map((wl, i) => {
              const member = getMemberById(wl.memberId);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full whitespace-nowrap">{wl.role}</span>
                  <span className="text-gray-800 font-medium">{member?.name || '—'}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lineup.worshipLeaders.map((wl, i) => {
              const member = getMemberById(wl.memberId);
              return (
                <span key={i} className="bg-primary-100 text-primary-800 font-semibold px-3 py-1 rounded-full text-sm">
                  {member?.name || '—'}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Back Ups */}
      {lineup.backUps.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Music4 size={16} className="text-primary-500" /> Back Ups
          </h3>
          <div className="flex flex-wrap gap-2">
            {lineup.backUps.map((id) => {
              const member = getMemberById(id);
              return (
                <span key={id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {member?.name || '—'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Instrumentalists */}
      <div className="card mb-4">
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Guitar size={16} className="text-primary-500" /> Instrumentalists
        </h3>
        <table className="w-full">
          <tbody>
            {INSTRUMENT_ROLES.filter(r => r.key !== 'soundEngineer').map((role) => (
              <RoleRow
                key={role.key}
                label={role.label}
                memberIds={lineup.instruments[role.key] || []}
                getMemberById={getMemberById}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Sound Engineer */}
      <div className="card mb-4">
        <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-primary-500" /> Sound Engineer
        </h3>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          {se?.name || '—'}
        </span>
      </div>

      {/* Notes */}
      {lineup.notes && (
        <div className="card mb-4">
          <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
            <BookOpen size={16} className="text-primary-500" /> Notes / Songs
          </h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{lineup.notes}</p>
        </div>
      )}

      {/* Reminder */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex gap-2">
        <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-yellow-600" />
        <span><strong>Reminder:</strong> All assigned Worship/Music Team should be sitting in the designated seats during service | No phone usage at the stage except for worship-related items | Be presentable | Do it for the Lord.</span>
      </div>
    </div>
  );
}
