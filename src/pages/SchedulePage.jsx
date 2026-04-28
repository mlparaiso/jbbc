import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Mic2, Music4, CalendarCheck, ChevronLeft, ChevronRight,
  CalendarDays, Plus, BookOpen, Quote, Pencil, Check, X, Printer, Wand2, ExternalLink
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
    <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 text-xs">
      <span className={iconClass}>{icon}</span>
      {name}
    </span>
  );
}

export default function SchedulePage() {
  const { lineups, canManageLineups, getMemberById, updateLineup, addLineups, templates } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const year = parseInt(searchParams.get('year') || now.getFullYear());
  const month = parseInt(searchParams.get('month') || (now.getMonth() + 1));
  const [editingTheme, setEditingTheme] = useState(false);
  const [themeInput, setThemeInput] = useState('');
  const [verseInput, setVerseInput] = useState('');
  // Generate panel state — used only on empty months
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [generateMode, setGenerateMode] = useState('copy'); // 'copy' | 'template' | 'blank'
  const [copySourceYear, setCopySourceYear] = useState(now.getFullYear());
  const [copySourceMonth, setCopySourceMonth] = useState(now.getMonth() === 0 ? 12 : now.getMonth());
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [copySongs, setCopySongs] = useState(false);
  const [copyMembers, setCopyMembers] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateDone, setGenerateDone] = useState(false);

  const MIN_YEAR = 2026;
  const MIN_MONTH = 1;
  const atMin = year === MIN_YEAR && month === MIN_MONTH;

  const todayStr = now.toISOString().slice(0, 10);

  const monthLineups = lineups
    .filter((l) => {
      const d = new Date(l.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Monthly theme and bible verse from the first lineup
  const monthTheme = monthLineups.find(l => l.theme)?.theme || '';
  const monthBibleVerse = monthLineups.find(l => l.bibleVerse)?.bibleVerse || '';

  const goToMonth = (y, m) => navigate(`/schedule?year=${y}&month=${m}`);
  const prevMonth = () => {
    if (atMin) return;
    if (month === 1) goToMonth(year - 1, 12);
    else goToMonth(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 12) goToMonth(year + 1, 1);
    else goToMonth(year, month + 1);
  };

  const handleGenerate = () => {
    if (generating || generateDone) return;
    setGenerating(true);

    const targetSundays = getSundaysInMonth(year, month);
    const toAdd = [];

    if (generateMode === 'copy') {
      const sourceLineups = lineups
        .filter(l => {
          const d = new Date(l.date + 'T00:00:00');
          return d.getFullYear() === copySourceYear && d.getMonth() + 1 === copySourceMonth;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      const copyCount = Math.min(sourceLineups.length, targetSundays.length);
      for (let i = 0; i < copyCount; i++) {
        const src = sourceLineups[i];
        toAdd.push({
          ...src,
          id: undefined,
          date: targetSundays[i],
          theme: src.theme || '',
          bibleVerse: src.bibleVerse || '',
          practiceDate: '',
          practiceTiming: 'after',
          nextWL: '',
          worshipLeaders: copyMembers
            ? (src.worshipLeaders || [{ memberId: '', role: 'Worship Leader' }])
            : [{ memberId: '', role: 'Worship Leader' }],
          backUps: copyMembers ? (src.backUps || []) : [],
          instruments: copyMembers
            ? (src.instruments || { k1: [], k2: [], bass: [], leadGuitar: [], acousticGuitar: [], drums: [], extras: [] })
            : { k1: [], k2: [], bass: [], leadGuitar: [], acousticGuitar: [], drums: [], extras: [] },
          soundEngineer: copyMembers ? (src.soundEngineer || '') : '',
          songs: copySongs ? (src.songs || []) : [],
          notes: src.notes || '',
        });
      }
      // Fill remaining target Sundays with blank slots
      for (let i = copyCount; i < targetSundays.length; i++) {
        toAdd.push({
          date: targetSundays[i],
          isTeamA: false,
          theme: '',
          bibleVerse: '',
          worshipLeaders: [{ memberId: '', role: 'Worship Leader' }],
          backUps: [],
          instruments: { k1: [], k2: [], bass: [], leadGuitar: [], acousticGuitar: [], drums: [], extras: [] },
          soundEngineer: '',
          practiceDate: '',
          practiceTiming: 'after',
          nextWL: '',
          songs: [],
          notes: '',
        });
      }
    } else if (generateMode === 'template') {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (!template) { setGenerating(false); return; }
      for (const sunday of targetSundays) {
        toAdd.push({
          date: sunday,
          isTeamA: template.isTeamA || false,
          theme: '',
          bibleVerse: '',
          worshipLeaders: template.worshipLeaders || [{ memberId: '', role: 'Worship Leader' }],
          backUps: template.backUps || [],
          instruments: template.instruments || { k1: [], k2: [], bass: [], leadGuitar: [], acousticGuitar: [], drums: [], extras: [] },
          soundEngineer: template.soundEngineer || '',
          practiceDate: '',
          practiceTiming: 'after',
          nextWL: '',
          songs: [],
          notes: template.notes || '',
        });
      }
    } else {
      // blank
      for (const sunday of targetSundays) {
        toAdd.push({
          date: sunday,
          isTeamA: false,
          theme: '',
          bibleVerse: '',
          worshipLeaders: [{ memberId: '', role: 'Worship Leader' }],
          backUps: [],
          instruments: { k1: [], k2: [], bass: [], leadGuitar: [], acousticGuitar: [], drums: [], extras: [] },
          soundEngineer: '',
          practiceDate: '',
          practiceTiming: 'after',
          nextWL: '',
          songs: [],
          notes: '',
        });
      }
    }

    addLineups(toAdd);
    setGenerating(false);
    setGenerateDone(true);
    setTimeout(() => {
      setShowGeneratePanel(false);
      setGenerateDone(false);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top bar: All Months + Print (same row) */}
      <div className="flex items-center justify-between mb-3 print:hidden">
        <Link to="/" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> All Months
        </Link>
        {monthLineups.length > 0 && (
          <button onClick={() => window.print()} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 whitespace-nowrap">
            <Printer size={13} /> Print Month
          </button>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <button onClick={prevMonth} className={`p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${atMin ? 'opacity-30 cursor-not-allowed' : ''}`}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{MONTHS[month - 1]} {year}</h2>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

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
        <div className="mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl px-4 py-3 print:hidden">
          {!editingTheme ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-primary-500" title="Monthly Theme" />
                  {monthTheme
                    ? <span className="text-sm font-bold text-primary-800">{monthTheme}</span>
                    : <span className="text-sm text-primary-400 italic">No theme set. Click ✏️ to add one.</span>
                  }
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
              {false && null /* theme name is now inline above */}
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
          {(() => {
            // Find the date of the next upcoming (or today's) service this month
            const upcomingDate = monthLineups.map(l => l.date).sort().find(d => d >= todayStr) || null;
            return monthLineups.map((lineup) => {
            const isGold = lineup.date === upcomingDate;
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
                  className={`rounded-xl cursor-pointer transition-all border-l-4 border hover:shadow-sm ${
                    isGold
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 border-l-amber-400 hover:border-amber-300 shadow-sm'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 border-l-primary-400'
                  }`}
                >
                  {/* Top row: date + Team A badge + practice date + arrow */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm ${isGold ? 'text-amber-800 dark:text-amber-300' : 'text-gray-800 dark:text-gray-100'}`}>{shortDate(lineup.date)}</span>
                      {isGold && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200">Upcoming</span>}
                      {lineup.isTeamA && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Team A</span>
                      )}
                      {lineup.practiceDate && (
                        <span className="text-xs flex items-center gap-0.5 text-teal-600 dark:text-teal-400">
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
                    <span className="text-sm font-medium leading-tight text-gray-700 dark:text-gray-200">{wlNames || 'TBA'}</span>
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

                  {/* Set List card */}
                  {lineup.setListUrl && (
                    <div className="px-4 pb-3">
                      <a
                        href={lineup.setListUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 text-xs font-semibold hover:bg-primary-100 dark:hover:bg-primary-800/40 transition-colors"
                      >
                        <ExternalLink size={11} />
                        Set List
                      </a>
                    </div>
                  )}

                </div>
              </div>
            );
          });
          })()}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400 print:hidden">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-4">No lineups for this month yet.</p>
          {canManageLineups && !showGeneratePanel && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => navigate(`/lineup/new?year=${year}&month=${month}`)} className="btn-primary flex items-center gap-1.5">
                <Plus size={15} /> Add Service Slot
              </button>
              <button
                onClick={() => { setShowGeneratePanel(true); setGenerateDone(false); }}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <Wand2 size={13} /> Generate Month Schedule
              </button>
            </div>
          )}
          {canManageLineups && showGeneratePanel && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm p-5 text-left max-w-sm mx-auto space-y-4">
              {/* Header */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-0.5 flex items-center gap-1.5">
                  <Wand2 size={14} className="text-primary-500" />
                  Generate Schedule for {MONTHS[month - 1]} {year}
                </h3>
                <p className="text-xs text-gray-400">
                  {getSundaysInMonth(year, month).length} Sundays: {getSundaysInMonth(year, month).map(d => printDate(d)).join(', ')}
                </p>
              </div>

              {/* Mode tabs */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs font-medium">
                {[
                  { key: 'copy', label: 'Copy', fullLabel: 'Copy from Month' },
                  { key: 'template', label: 'Template', fullLabel: 'From Template' },
                  { key: 'blank', label: 'Blank', fullLabel: 'Blank Sundays' },
                ].map(({ key, label, fullLabel }) => (
                  <button
                    key={key}
                    onClick={() => setGenerateMode(key)}
                    title={fullLabel}
                    className={`flex-1 py-1.5 px-1 transition-colors ${
                      generateMode === key
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="hidden sm:inline">{fullLabel}</span>
                    <span className="sm:hidden">{label}</span>
                  </button>
                ))}
              </div>

              {/* Mode: Copy from Month */}
              {generateMode === 'copy' && (() => {
                const srcLineups = lineups
                  .filter(l => {
                    const d = new Date(l.date + 'T00:00:00');
                    return d.getFullYear() === copySourceYear && d.getMonth() + 1 === copySourceMonth;
                  })
                  .sort((a, b) => a.date.localeCompare(b.date));
                const tgtSundays = getSundaysInMonth(year, month);
                const extra = tgtSundays.length - srcLineups.length;
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Source Month</label>
                        <select className="input" value={copySourceMonth} onChange={e => setCopySourceMonth(Number(e.target.value))}>
                          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Year</label>
                        <select className="input" value={copySourceYear} onChange={e => setCopySourceYear(Number(e.target.value))}>
                          {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                    {/* Options */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={copyMembers}
                          onChange={e => setCopyMembers(e.target.checked)}
                          className="rounded"
                        />
                        Copy member assignments
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={copySongs}
                          onChange={e => setCopySongs(e.target.checked)}
                          className="rounded"
                        />
                        Also copy song lists
                      </label>
                    </div>
                    {/* Source info */}
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p>Source: <strong>{srcLineups.length} lineup{srcLineups.length !== 1 ? 's' : ''}</strong> in {MONTHS[copySourceMonth - 1]} {copySourceYear}</p>
                      {extra > 0 && <p className="text-amber-600">⚠️ {extra} extra Sunday{extra !== 1 ? 's' : ''} will be created as blank.</p>}
                      {extra < 0 && <p className="text-blue-600">ℹ️ Only the first {tgtSundays.length} source lineups will be used.</p>}
                    </div>
                    {/* Preview */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Preview</p>
                      {tgtSundays.map((sunday, i) => {
                        const src = srcLineups[i];
                        return (
                          <div key={sunday} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                            <span className="font-medium">{printDate(sunday)} (Sun)</span>
                            {src
                              ? <span className="text-gray-400">← copied from {printDate(src.date)}</span>
                              : <span className="text-amber-500">← blank slot</span>
                            }
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Mode: From Template */}
              {generateMode === 'template' && (
                <div className="space-y-3">
                  {templates.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No templates saved yet. Save a template first from the lineup form.</p>
                  ) : (
                    <div>
                      <label className="label">Select Template</label>
                      <select
                        className="input"
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                      >
                        <option value="">— choose a template —</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name || `Template ${t.id.slice(0, 6)}`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Preview */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Preview</p>
                    {getSundaysInMonth(year, month).map(sunday => (
                      <div key={sunday} className="text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{printDate(sunday)} (Sun)</span>
                        {selectedTemplateId && (
                          <span className="text-gray-400 ml-1.5">← from template</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode: Blank Sundays */}
              {generateMode === 'blank' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Creates one empty lineup slot per Sunday. All fields will be blank except the date.</p>
                  {/* Preview */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Preview</p>
                    {getSundaysInMonth(year, month).map(sunday => (
                      <div key={sunday} className="text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{printDate(sunday)} (Sun)</span>
                        <span className="text-gray-400 ml-1.5">← blank slot</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleGenerate}
                  disabled={
                    generating ||
                    generateDone ||
                    (generateMode === 'template' && (templates.length === 0 || !selectedTemplateId))
                  }
                  className={`btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 ${generateDone ? 'opacity-70' : ''}`}
                >
                  {generateDone ? '✅ Done!' : generating ? 'Generating…' : <><Wand2 size={13} /> Generate</>}
                </button>
                <button
                  onClick={() => setShowGeneratePanel(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
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
