import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { INSTRUMENT_ROLES, ROLE_CATEGORIES } from '../data/initialData';
import { Plus, Trash2, ChevronLeft, ClipboardList, Mic2, Music4, Guitar, SlidersHorizontal, BookOpen, FileText, GripVertical, Copy, AlertTriangle } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SONG_SECTIONS = ['Opening', 'Opening/Welcome', 'Welcome', 'Praise and Worship', "Lord's Table", 'Special Number', 'Other'];
const TEAM_A_ROLES = ["Opening/Welcome", "Praise", "Worship", "Lord's Table", "Opening", "Other"];

// Autocomplete input for song titles
function SongAutocomplete({ value, onChange, songLibrary, inputClass }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const matches = value.trim().length > 0
    ? songLibrary.filter(s => s.title.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative min-w-0">
      <input
        type="text"
        className={inputClass || 'input w-full'}
        placeholder="Song title"
        value={value}
        onChange={e => { onChange({ title: e.target.value }); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {matches.map((s, i) => (
            <button key={i} type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-primary-50 text-xs flex items-center justify-between"
              onMouseDown={() => { onChange({ title: s.title, youtubeUrl: s.youtubeUrl, section: s.section }); setOpen(false); }}
            >
              <span className="font-medium text-gray-800 truncate">{s.title}</span>
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{s.section} · {s.count}×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact input style shared across all form fields
const ci = 'w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white';

// Draggable song row
function SortableSongRow({ song, index, songLibrary, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(index) });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-[16px_140px_1fr_140px_20px] gap-1.5 items-center">
      <button type="button" {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none">
        <GripVertical size={14} />
      </button>
      <select className={ci} value={song.section} onChange={e => onChange({ section: e.target.value })}>
        {SONG_SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
      </select>
      <SongAutocomplete value={song.title} onChange={onChange} songLibrary={songLibrary} inputClass={ci} />
      <input type="url" className={ci} placeholder="YT URL (opt.)"
        value={song.youtubeUrl || ''} onChange={e => onChange({ youtubeUrl: e.target.value })} />
      <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 flex justify-center">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function MultiSelect({ label, memberOptions, selected, onChange, placeholder }) {
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else onChange([...selected, id]);
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-10 bg-white">
        {memberOptions.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
              selected.includes(m.id)
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">Selected: {selected.map(id => memberOptions.find(m => m.id === id)?.name).filter(Boolean).join(', ')}</p>
      )}
    </div>
  );
}

function SingleSelect({ label, memberOptions, selected, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={selected || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">— Select —</option>
        {memberOptions.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );
}

export default function LineupFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getLineupById, addLineup, updateLineup, members, isAdmin, lineups } = useApp();

  const isEdit = id && id !== 'new';
  const existing = isEdit ? getLineupById(id) : null;
  const [searchParams] = useSearchParams();

  // Pre-fill date from ?year=&month= when creating a new lineup
  const prefillDate = (() => {
    if (isEdit || existing) return '';
    const y = searchParams.get('year');
    const m = searchParams.get('month');
    if (y && m) return `${y}-${String(m).padStart(2, '0')}-01`;
    return '';
  })();

  const emptyForm = {
    date: prefillDate,
    isTeamA: false,
    theme: '',
    worshipLeaders: [{ memberId: '', role: 'Worship Leader' }],
    backUps: [],
    instruments: { k1: [], k2: [], bass: [], leadGuitar: [], acousticGuitar: [], drums: [] },
    soundEngineer: '',
    practiceDate: '',
    nextWL: '',
    bibleVerse: '',
    songs: [],
    notes: '',
  };

  const [form, setForm] = useState(existing || emptyForm);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing) setForm(existing);
  }, [id]);

  // Song library: all unique songs from past lineups (for autocomplete)
  const songLibrary = useMemo(() => {
    const map = {};
    for (const l of lineups) {
      for (const s of l.songs || []) {
        const key = s.title.trim().toLowerCase();
        if (!key) continue;
        if (!map[key]) map[key] = { title: s.title.trim(), section: s.section, youtubeUrl: s.youtubeUrl || '', count: 0 };
        map[key].count++;
        if (s.youtubeUrl) map[key].youtubeUrl = s.youtubeUrl;
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [lineups]);

  // Duplicate detection: is there already a lineup on this date (excluding current edit)?
  const duplicateLineup = !isEdit && form.date
    ? lineups.find(l => l.date === form.date)
    : null;

  // Previous lineup (for copy instruments)
  const prevLineup = useMemo(() => {
    if (!form.date || isEdit) return null;
    const sorted = [...lineups].filter(l => l.date < form.date).sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] || null;
  }, [form.date, lineups, isEdit]);

  // Auto-fill Next WL from the next scheduled lineup
  const suggestedNextWL = useMemo(() => {
    if (!form.date) return null;
    const sorted = [...lineups].filter(l => l.date > form.date).sort((a, b) => a.date.localeCompare(b.date));
    const next = sorted[0];
    if (!next) return null;
    // If next lineup is a Team A Sunday, use "Team A" nickname
    if (next.isTeamA) return 'Team A';
    const names = (next.worshipLeaders || [])
      .map(wl => members.find(m => m.id === wl.memberId)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(' & ') : null;
  }, [form.date, lineups, members]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setForm(f => {
        const songs = f.songs || [];
        const oldIndex = Number(active.id);
        const newIndex = Number(over.id);
        return { ...f, songs: arrayMove(songs, oldIndex, newIndex) };
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">🔐</div>
        <p>You need to be an admin to create or edit lineups.</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">Back to Schedule</button>
      </div>
    );
  }

  // Filtered member lists by role
  const vocalists = members.filter(m => m.roles.includes(ROLE_CATEGORIES.VOCALIST));
  const keyboardists = members.filter(m => m.roles.includes(ROLE_CATEGORIES.KEYBOARD));
  const bassists = members.filter(m => m.roles.includes(ROLE_CATEGORIES.BASS));
  const guitarists = members.filter(m => m.roles.includes(ROLE_CATEGORIES.GUITAR));
  const drummers = members.filter(m => m.roles.includes(ROLE_CATEGORIES.DRUMS));
  const soundEngineers = members.filter(m => m.roles.includes(ROLE_CATEGORIES.SOUND));

  const updateInstrument = (key, value) => {
    setForm(f => ({ ...f, instruments: { ...f.instruments, [key]: value } }));
  };

  const addWL = () => setForm(f => ({
    ...f,
    worshipLeaders: [...f.worshipLeaders, { memberId: '', role: 'Worship Leader' }],
  }));

  const updateWL = (i, field, value) => {
    setForm(f => ({
      ...f,
      worshipLeaders: f.worshipLeaders.map((wl, idx) => idx === i ? { ...wl, [field]: value } : wl),
    }));
  };

  const removeWL = (i) => setForm(f => ({
    ...f,
    worshipLeaders: f.worshipLeaders.filter((_, idx) => idx !== i),
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) return alert('Please select a date.');
    if (isEdit) {
      await updateLineup(id, form);
      setSaved(true);
      // After editing, go back to the lineup detail page
      setTimeout(() => navigate(`/lineup/${id}`), 500);
    } else {
      const newId = await addLineup(form);
      setSaved(true);
      // After creating, go to the new lineup's detail page
      const d = new Date(form.date + 'T00:00:00');
      const targetId = newId || `lineup-${form.date}`;
      setTimeout(() => navigate(`/lineup/${targetId}`), 500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="text-primary-600 hover:underline text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {isEdit ? 'Edit Lineup' : 'New Lineup'}
        </h2>
        <div className="w-16" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <div className="card space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <ClipboardList size={14} className="text-primary-500" /> Service Info
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Service Date *</label>
              <input type="date" className="input" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              {duplicateLineup && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <AlertTriangle size={12} /> A lineup already exists for this date — saving will overwrite it.
                </p>
              )}
            </div>
            <div>
              <label className="label">Practice Date</label>
              <input type="date" className="input" value={form.practiceDate}
                onChange={e => setForm(f => ({ ...f, practiceDate: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Monthly Theme</label>
            <input type="text" className="input" placeholder="e.g. Pursuing after God's Best"
              value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} />
          </div>

          <div>
            <label className="label">Bible Verse (optional)</label>
            <input type="text" className="input" placeholder='e.g. "For I know the plans..." — Jeremiah 29:11'
              value={form.bibleVerse || ''} onChange={e => setForm(f => ({ ...f, bibleVerse: e.target.value }))} />
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="isTeamA" checked={form.isTeamA}
              onChange={e => setForm(f => ({ ...f, isTeamA: e.target.checked }))}
              className="w-4 h-4 accent-primary-600" />
            <label htmlFor="isTeamA" className="text-sm font-medium text-gray-700">
              🌟 This is a Team A Sunday (first Sunday of the month)
            </label>
          </div>
        </div>

        {/* Worship Leaders */}
        <div className="card space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Mic2 size={14} className="text-primary-500" /> Worship Leader(s)
          </h3>
          {form.worshipLeaders.map((wl, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1">
                <select className="input" value={wl.memberId}
                  onChange={e => updateWL(i, 'memberId', e.target.value)}>
                  <option value="">— Select Member —</option>
                  {vocalists.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              {form.isTeamA ? (
                <div className="flex-1">
                  <select className="input" value={wl.role}
                    onChange={e => updateWL(i, 'role', e.target.value)}>
                    {TEAM_A_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              ) : (
                <input type="text" className="input flex-1" placeholder="Role (optional)"
                  value={wl.role} onChange={e => updateWL(i, 'role', e.target.value)} />
              )}
              {form.worshipLeaders.length > 1 && (
                <button type="button" onClick={() => removeWL(i)}
                  className="text-red-400 hover:text-red-600 text-xl mt-1 flex-shrink-0">×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addWL} className="text-primary-600 hover:underline text-sm">
            + Add another worship leader
          </button>
        </div>

        {/* Back Ups */}
        <div className="card">
          <MultiSelect
            label={<span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1"><Music4 size={14} className="text-primary-500" /> Back Ups</span>}
            memberOptions={vocalists}
            selected={form.backUps}
            onChange={val => setForm(f => ({ ...f, backUps: val }))}
          />
        </div>

        {/* Instruments */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Guitar size={14} className="text-primary-500" /> Instrumentalists
            </h3>
            {prevLineup && (
              <button type="button"
                onClick={() => setForm(f => ({ ...f, instruments: prevLineup.instruments, soundEngineer: prevLineup.soundEngineer }))}
                className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
              >
                <Copy size={12} /> Copy from {prevLineup.date}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SingleSelect label="Keyboard 1 (K1)" memberOptions={keyboardists}
              selected={form.instruments.k1[0] || ''} onChange={v => updateInstrument('k1', v ? [v] : [])} />
            <SingleSelect label="Keyboard 2 (K2)" memberOptions={keyboardists}
              selected={form.instruments.k2[0] || ''} onChange={v => updateInstrument('k2', v ? [v] : [])} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MultiSelect label="Bass (B)" memberOptions={bassists}
              selected={form.instruments.bass} onChange={v => updateInstrument('bass', v)} />
            <MultiSelect label="Lead Guitar (LG)" memberOptions={guitarists}
              selected={form.instruments.leadGuitar} onChange={v => updateInstrument('leadGuitar', v)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MultiSelect label="Acoustic Guitar (AG)" memberOptions={guitarists}
              selected={form.instruments.acousticGuitar} onChange={v => updateInstrument('acousticGuitar', v)} />
            <MultiSelect label="Drums (D)" memberOptions={drummers}
              selected={form.instruments.drums} onChange={v => updateInstrument('drums', v)} />
          </div>
        </div>

        {/* Sound Engineer */}
        <div className="card">
          <SingleSelect label={<span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1"><SlidersHorizontal size={14} className="text-primary-500" /> Sound Engineer</span>} memberOptions={soundEngineers}
            selected={form.soundEngineer} onChange={v => setForm(f => ({ ...f, soundEngineer: v }))} />
        </div>

        {/* Songs */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen size={14} className="text-primary-500" /> Songs
            </h3>
            <button type="button" onClick={() => setForm(f => ({
              ...f,
              songs: [...(f.songs || []), { section: 'Praise and Worship', title: '', youtubeUrl: '' }]
            }))} className="text-primary-600 hover:underline text-xs flex items-center gap-1">
              <Plus size={13} /> Add Song
            </button>
          </div>
          {(form.songs || []).length === 0 && (
            <p className="text-xs text-gray-400">No songs added yet. Click "Add Song" to start.</p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={(form.songs || []).map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {(form.songs || []).map((song, i) => (
                  <SortableSongRow
                    key={i}
                    song={song}
                    index={i}
                    songLibrary={songLibrary}
                    onChange={updates => setForm(f => ({
                      ...f,
                      songs: f.songs.map((s, idx) => idx === i ? { ...s, ...updates } : s),
                    }))}
                    onRemove={() => setForm(f => ({ ...f, songs: f.songs.filter((_, idx) => idx !== i) }))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Next WL */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Mic2 size={14} className="text-primary-500" /> Next Worship Leader
            </label>
            {suggestedNextWL && form.nextWL !== suggestedNextWL && (
              <button type="button"
                onClick={() => setForm(f => ({ ...f, nextWL: suggestedNextWL }))}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                <Copy size={11} /> Use: {suggestedNextWL}
              </button>
            )}
          </div>
          <input type="text" className="input" placeholder="e.g. Jasper, Team A, Myk & Miho"
            value={form.nextWL || ''} onChange={e => setForm(f => ({ ...f, nextWL: e.target.value }))} />
          {suggestedNextWL && (
            <p className="text-xs text-gray-400 mt-1">
              💡 Next scheduled WL: <span className="font-medium text-gray-600">{suggestedNextWL}</span>
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="card">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <FileText size={14} className="text-primary-500" /> Notes (optional)
          </label>
          <textarea className="input" rows={2} placeholder="Any other special notes..."
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" className={`btn-primary flex-1 ${saved ? 'opacity-70' : ''}`} disabled={saved}>
            {saved ? '✅ Saved!' : isEdit ? 'Save Changes' : 'Create Lineup'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
