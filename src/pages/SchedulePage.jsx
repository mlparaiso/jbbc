import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Mic2, Music4, CalendarCheck, ChevronLeft, ChevronRight,
  CalendarDays, Plus, BookOpen, Quote, Pencil, Check, X, Printer, Copy
} from 'lucide-react';
import { Piano, Guitar, Waves, Drum, SlidersHorizontal, Music2 } from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function printDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' });
}

// Get all Sundays in a given year/month (timezone-safe: use local date parts)
function getSundaysInMonth(year, month) {
  const sundays = [];
  const d = new Date(year, month - 1, 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  while (d.getMonth() === month - 1) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    sundays.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 7);
  }
  return sundays;
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
  const { lineups, isAdmin, canManageLineups, getMemberById, updateLineup, addLineups } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const year = parseInt(searchParams.get('year') || now.getFullYear());
  const month = parseInt(searchParams.get('month') || (now.getMonth() + 1));
  const [editingTheme, setEditingTheme] = useState(false);
  const [themeInput, setThemeInput] = useState('');
  const [verseInput, setVerseInput] = useState('');
  // Copy-from state — used only on empty months
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState(now.getFullYear());
  const [copySourceMonth, setCopySourceMonth] = useState(now.getMonth() === 0 ? 12 : now.getMonth());
  const [copyDoing, setCopyDoing] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const MIN_YEAR = 2026;
  const MIN_MONTH = 1;
  const atMin = year === MIN_YEAR && month === MIN_MONTH;

  const monthLineups = lineups
    .filter((l) => {
      const d = new Date(l.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Monthly theme and bible verse from the first lineup
  const monthTheme = monthLineups.find(l => l.theme)?.theme || '';
  const monthBibleVerse = monthLineups.find(l => l.bibleVerse)?.bibleVerse || '';

  const goToMonth = (y, m) => setSearchParams({ year: y, month: m });
  const prevMonth = () => {
    if (atMin) return;
    if (month === 1) goToMonth(year - 1, 12);
    else goToMonth(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 12) goToMonth(year + 1, 1);
    else goToMonth(year, month + 1);
  };

  const handleCopyFrom = () => {
    if (copyDoing || copyDone) return;
    setCopyDoing(true);
    // Source lineups from the selected month
    const sourceLineups = lineups
      .filter(l => {
        const d = new Date(l.date + 'T00:00:00');
        return d.getFullYear() === copySourceYear && d.getMonth() + 1 === copySourceMonth;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Target Sundays for the current (empty) month
    const targetSundays = getSundaysInMonth(year, month);
    const targetCount = targetSundays.length;
    const sourceCount = sourceLineups.length;

    const toAdd = [];
    const copyCount = Math.min(sourceCount, targetCount);
    for (let i = 0; i < copyCount; i++) {
      toAdd.push({
        ...sourceLineups[i],
        id: undefined,
        date: targetSundays[i],
        practiceDate: '',
        nextWL: '',
        songs: sourceLineups[i].songs || [],
        notes: sourceLineups[i].notes || '',
      });
    }
    for (let i = copyCount; i < targetCount; i++) {
      toAdd.push({
        date: targetSundays[i],
        isTeamA: false,
        theme: '',
        bibleVerse: '',
        worshipLeaders: [{ memberId: '', role: 'Worship Leader' }],
        backUps: [],
        instruments: { k1: [], k2: [], bass: [], leadGuitar: [], acousticGuitar: [], drums: [] },
        soundEngineer: '',
        practiceDate: '',
        nextWL: '',
        songs: [],
        notes: '',
      });
    }
    addLineups(toAdd);
    setCopyDoing(false);
    setCopyDone(true);
    setTimeout(() => {
      setShowCopyPanel(false);
      setCopyDone(false);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back to Year Calendar */}
      <div className="mb-3 print:hidden">
        <button onClick={() => navigate('/')} className="text-primary-600 hover:underline text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> All Months
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4 print:hidden">
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

      {/* Action buttons — only when month has lineups */}
      {monthLineups.length > 0 && (
        <div className="flex justify-end gap-2 mb-3 print:hidden">
          <button onClick={() => window.print()} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 whitespace-nowrap">
            <Printer size={13} /> Print Month
          </button>
        </div>
      )}

      {/* Printable monthly table — hidden on screen */}
      <div className="hidden print:block mb-6">
        {/* Print Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-primary-600">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Worship Schedule</h1>
            <h2 className="text-base font-semibold text-primary-700">{MONTHS[month - 1]} {year} — Worship Schedule</h2>
          </div>
          <div className="text-right">
            {monthTheme && <p className="text-xs font-bold text-primary-600 uppercase tracking-wide">Theme</p>}
            {monthTheme && <p className="text-sm font-semibold text-gray-800">{monthTheme}</p>}
            {monthBibleVerse && <p className="text-xs text-gray-500 italic mt-0.5 max-w-xs">"{monthBibleVerse}"</p>}
          </div>
        </div>

        {/* Styled Table */}
        <table className="w-full text-xs border-collapse rounded-lg overflow-hidden">
          <thead>
            <tr style={{backgroundColor: '#4f46e5', color: 'white'}}>
              <th className="py-2 px-2 text-left font-semibold whitespace-nowrap">Date</th>
              <th className="py-2 px-2 text-left font-semibold">Worship Leader</th>
              <th className="py-2 px-2 text-left font-semibold">Back Ups</th>
              <th className="py-2 px-2 text-center font-semibold">K1</th>
              <th className="py-2 px-2 text-center font-semibold">K2</th>
              <th className="py-2 px-2 text-center font-semibold">BG</th>
              <th className="py-2 px-2 text-center font-semibold">LG</th>
              <th className="py-2 px-2 text-center font-semibold">AG</th>
              <th className="py-2 px-2 text-center font-semibold">D</th>
              <th className="py-2 px-2 text-center font-semibold">SE</th>
            </tr>
          </thead>
          <tbody>
            {monthLineups.map((l, i) => {
              const wl = l.worshipLeaders.map(w => getMemberById(w.memberId)?.name || '—').join(', ');
              const bu = l.backUps.map(id => getMemberById(id)?.name).filter(Boolean).join(', ') || '—';
              const k1p = (l.instruments.k1 || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const k2p = (l.instruments.k2 || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const bp = (l.instruments.bass || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const lgp = (l.instruments.leadGuitar || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const agp = (l.instruments.acousticGuitar || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const dp = (l.instruments.drums || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const sep = getMemberById(l.soundEngineer)?.name || '—';
              return (
                <tr key={l.id} style={{backgroundColor: i % 2 === 0 ? '#f5f3ff' : '#ffffff', borderBottom: '1px solid #e5e7eb'}}>
                  <td className="py-2 px-2 font-semibold text-gray-800 whitespace-nowrap">{printDate(l.date)}</td>
                  <td className="py-2 px-2 font-medium text-gray-800">{wl}</td>
                  <td className="py-2 px-2 text-gray-600">{bu}</td>
                  <td className="py-2 px-2 text-center text-gray-700">{k1p}</td>
                  <td className="py-2 px-2 text-center text-gray-700">{k2p}</td>
                  <td className="py-2 px-2 text-center text-gray-700">{bp}</td>
                  <td className="py-2 px-2 text-center text-gray-700">{lgp}</td>
                  <td className="py-2 px-2 text-center text-gray-700">{agp}</td>
                  <td className="py-2 px-2 text-center text-gray-700">{dp}</td>
                  <td className="py-2 px-2 text-center text-gray-700">{sep}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Print Footer */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Worship Schedule © {new Date().getFullYear()} — Sit in designated seats | No personal phone use on stage | Be presentable | Do it for the Lord.
        </p>
      </div>

      {/* Monthly Theme + Bible Verse */}
      {(monthTheme || canManageLineups) && (
        <div className="mb-4 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 print:hidden">
          {!editingTheme ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-primary-500" />
                  <span className="text-xs font-bold text-primary-500 uppercase tracking-wide">Monthly Theme</span>
                </div>
                {canManageLineups && (
                  <button
                    onClick={() => { setThemeInput(monthTheme); setVerseInput(monthBibleVerse); setEditingTheme(true); }}
                    className="text-primary-400 hover:text-primary-600 p-1 rounded"
                    title="Edit theme & verse"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
              {monthTheme
                ? <p className="text-base font-bold text-primary-800">{monthTheme}</p>
                : <p className="text-sm text-primary-400 italic">No theme set for this month. Click ✏️ to add one.</p>
              }
              {monthBibleVerse && (
                <div className="mt-2 pt-2 border-t border-primary-100">
                  <div className="flex items-start gap-1.5">
                    <Quote size={12} className="text-primary-300 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-primary-600 italic leading-relaxed">{monthBibleVerse}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen size={14} className="text-primary-500" />
                <span className="text-xs font-bold text-primary-500 uppercase tracking-wide">Edit Theme & Verse</span>
              </div>
              <input
                type="text"
                className="input text-sm"
                placeholder="Monthly Theme..."
                value={themeInput}
                onChange={e => setThemeInput(e.target.value)}
              />
              <textarea
                className="input text-sm"
                rows={2}
                placeholder='Bible verse (e.g. "For I know the plans..." — Jeremiah 29:11)'
                value={verseInput}
                onChange={e => setVerseInput(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    monthLineups.forEach(l => updateLineup(l.id, { ...l, theme: themeInput, bibleVerse: verseInput }));
                    setEditingTheme(false);
                  }}
                  className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
                >
                  <Check size={12} /> Save
                </button>
                <button
                  onClick={() => setEditingTheme(false)}
                  className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lineup list */}
      {monthLineups.length > 0 ? (
        <div className="space-y-2 print:hidden">
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
              <div key={lineup.id}>
                <div
                  onClick={() => navigate(`/lineup/${lineup.id}`)}
                  className="rounded-xl cursor-pointer transition-all border-l-4 bg-white border border-gray-100 hover:shadow-sm hover:border-primary-200 border-l-primary-400"
                >
                  {/* Top row: date + Team A badge + practice date + arrow */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-800">{shortDate(lineup.date)}</span>
                      {lineup.isTeamA && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Team A</span>
                      )}
                      {lineup.practiceDate && (
                        <span className="text-xs flex items-center gap-0.5 text-teal-600">
                          <CalendarCheck size={10} />
                          Practice: {shortDate(lineup.practiceDate)}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={15} className="text-gray-300" />
                  </div>

                  {/* WL + Backups on same row */}
                  <div className="flex items-start gap-1.5 px-4 pb-1">
                    <Mic2 size={13} className="flex-shrink-0 mt-0.5 text-primary-400" />
                    <span className="text-sm font-medium leading-tight text-gray-700">{wlNames || 'TBA'}</span>
                    {backupNames && (
                      <span className="text-xs leading-tight mt-0.5 ml-1 text-gray-400">+ {backupNames}</span>
                    )}
                  </div>

                  {/* Instruments */}
                  <div className="flex flex-wrap gap-1 px-4 pb-2 pt-0.5">
                    {k1 && <InstrumentPill icon={<Piano size={10} />} name={`K1: ${k1}`} iconClass="text-primary-400" />}
                    {k2 && <InstrumentPill icon={<Piano size={10} />} name={`K2: ${k2}`} iconClass="text-amber-500" />}
                    {bass && <InstrumentPill icon={<Waves size={10} />} name={`BG: ${bass}`} iconClass="text-primary-400" />}
                    {lg && <InstrumentPill icon={<Guitar size={10} />} name={`LG: ${lg}`} iconClass="text-orange-400" />}
                    {ag && <InstrumentPill icon={<Guitar size={10} />} name={`AG: ${ag}`} iconClass="text-primary-400" />}
                    {drums && <InstrumentPill icon={<Drum size={10} />} name={`D: ${drums}`} iconClass="text-primary-400" />}
                    {se && <InstrumentPill icon={<SlidersHorizontal size={10} />} name={`SE: ${se.name}`} iconClass="text-blue-400" />}
                    {(lineup.instruments.extras || []).map((extra, ei) => {
                      const names = (extra.memberIds || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/');
                      if (!names) return null;
                      return <InstrumentPill key={ei} icon={<Music2 size={10} />} name={`${extra.label}: ${names}`} iconClass="text-purple-400" />;
                    })}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400 print:hidden">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-4">No lineups for this month yet.</p>
          {canManageLineups && !showCopyPanel && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => navigate(`/lineup/new?year=${year}&month=${month}`)} className="btn-primary flex items-center gap-1.5">
                <Plus size={15} /> Add Service Slot
              </button>
              <button onClick={() => { setShowCopyPanel(true); setCopyDone(false); }} className="btn-secondary text-sm flex items-center gap-1.5">
                <Copy size={13} /> Copy from Another Month
              </button>
            </div>
          )}
          {canManageLineups && showCopyPanel && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 text-left max-w-sm mx-auto space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-0.5">Copy lineup into {MONTHS[month - 1]} {year}</h3>
                <p className="text-xs text-gray-400">
                  {MONTHS[month - 1]} {year} has <strong>{getSundaysInMonth(year, month).length} Sundays</strong>: {getSundaysInMonth(year, month).map(d => printDate(d)).join(', ')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Copy from Month</label>
                  <select className="input" value={copySourceMonth} onChange={e => setCopySourceMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year</label>
                  <select className="input" value={copySourceYear} onChange={e => setCopySourceYear(Number(e.target.value))}>
                    {[2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              {(() => {
                const src = lineups.filter(l => {
                  const d = new Date(l.date + 'T00:00:00');
                  return d.getFullYear() === copySourceYear && d.getMonth() + 1 === copySourceMonth;
                });
                const tgt = getSundaysInMonth(year, month);
                const extra = tgt.length - src.length;
                return (
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Source: <strong>{src.length} lineup{src.length !== 1 ? 's' : ''}</strong> in {MONTHS[copySourceMonth - 1]} {copySourceYear}</p>
                    {extra > 0 && <p className="text-amber-600">⚠️ {extra} extra Sunday{extra !== 1 ? 's' : ''} will be created as unassigned.</p>}
                    {extra < 0 && <p className="text-blue-600">ℹ️ Only the first {tgt.length} lineups will be copied.</p>}
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <button
                  onClick={handleCopyFrom}
                  disabled={copyDoing || copyDone}
                  className={`btn-primary flex-1 text-sm ${copyDone ? 'opacity-70' : ''}`}
                >
                  {copyDone ? '✅ Copied!' : copyDoing ? 'Copying…' : 'Copy Lineups'}
                </button>
                <button onClick={() => setShowCopyPanel(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin: Add Lineup Button */}
      {canManageLineups && monthLineups.length > 0 && (
        <div className="mt-4 text-center print:hidden">
          <button onClick={() => navigate(`/lineup/new?year=${year}&month=${month}`)} className="btn-primary flex items-center gap-1.5 mx-auto text-sm">
            <Plus size={15} /> Add Service Slot
          </button>
        </div>
      )}
    </div>
  );
}
