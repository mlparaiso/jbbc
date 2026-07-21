import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLE_CATEGORIES } from '../data/initialData';
import { normalizeLineupInstruments } from '../utils/normalizeLineupInstruments';
import { Plus, Trash2, ChevronLeft, ClipboardList, Mic2, Music4, Guitar, SlidersHorizontal, BookOpen, FileText, GripVertical, Copy, AlertTriangle, Music2, LayoutTemplate, Save, Link } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SONG_SECTIONS = ['Opening', 'Opening/Welcome', 'Welcome', 'Praise and Worship', "Lord's Table", 'Special Number', 'Other'];
const SONG_KEYS = ['', 'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const PRACTICE_TIMING_OPTIONS = [
  { value: 'after', label: 'After the service' },
  { value: 'before', label: 'Before the service' },
  { value: 'none', label: 'None' },
];

// Which non-core instrument slot ids currently have a visible "Additional
// Instruments" row, derived from whatever keys are present in the assignments
// map (anything that isn't a known core slot, including orphaned "legacy-*"
// keys from normalizeLineupInstruments).
function deriveActiveExtraSlotIds(assignments, instrumentSlots) {
  return Object.keys(assignments).filter(id => {
    const slot = instrumentSlots.find(s => s.id === id);
    return slot ? !slot.core : true;
  });
}

// Converts a saved lineup (old or new field shape) into the form's working shape.
function buildFormFromLineup(lineup, instrumentSlots) {
  const assignments = normalizeLineupInstruments(lineup, instrumentSlots);
  return {
    ...lineup,
    instrumentAssignments: assignments,
    activeExtraSlotIds: deriveActiveExtraSlotIds(assignments, instrumentSlots),
  };
}

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
              onMouseDown={() => {
                onChange({
                  title: s.title,
                  youtubeUrl: s.youtubeUrl,
                  section: s.section,
                  ...(s.defaultKey ? { key: s.defaultKey } : {}),
                });
                setOpen(false);
              }}
            >
              <span className="font-medium text-gray-800 truncate">{s.title}</span>
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{s.section}{s.count > 0 ? ` · ${s.count}×` : ''}</span>
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
    <div ref={setNodeRef} style={style} className="border border-gray-100 rounded-lg p-2 bg-gray-50 space-y-1.5">
      {/* Row 1: drag + section + remove */}
      <div className="flex items-center gap-1.5">
        <button type="button" {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
          <GripVertical size={14} />
        </button>
        <select className={`${ci} flex-1`} value={song.section} onChange={e => onChange({ section: e.target.value })}>
          {SONG_SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
        </select>
        <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 flex-shrink-0">
          <Trash2 size={13} />
        </button>
      </div>
      {/* Row 2: title autocomplete */}
      <SongAutocomplete value={song.title} onChange={onChange} songLibrary={songLibrary} inputClass={ci} />
      {/* Row 3: key + capo + YT URL */}
      <div className="flex gap-1.5 items-center flex-wrap">
        <select
          className={`${ci} w-20 flex-none`}
          value={song.key || ''}
          onChange={e => onChange({ key: e.target.value })}
          title="Song Key"
        >
          {SONG_KEYS.map(k => <option key={k} value={k}>{k || '— Key'}</option>)}
        </select>
        <div className="flex items-center gap-1 flex-none">
          <label className="text-xs text-gray-400 whitespace-nowrap">Capo</label>
          <input
            type="number"
            min="0"
            max="9"
            className={`${ci} w-14`}
            placeholder="0"
            value={song.capo ?? ''}
            onChange={e => onChange({ capo: e.target.value === '' ? '' : Number(e.target.value) })}
            title="Capo fret"
          />
        </div>
        <input type="url" className={`${ci} flex-1 min-w-0`} placeholder="YT URL (opt.)"
          value={song.youtubeUrl || ''} onChange={e => onChange({ youtubeUrl: e.target.value })} />
      </div>
    </div>
  );
}

function MultiSelect({ label, memberOptions, selected, onChange, disabledIds = [] }) {
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else if (!disabledIds.includes(id)) onChange([...selected, id]);
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-10 bg-white">
        {memberOptions.map(m => {
          const isSelected = selected.includes(m.id);
          const isDisabled = !isSelected && disabledIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              disabled={isDisabled}
              title={isDisabled ? 'Already assigned elsewhere' : undefined}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : isDisabled
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {m.name}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">Selected: {selected.map(id => memberOptions.find(m => m.id === id)?.name).filter(Boolean).join(', ')}</p>
      )}
    </div>
  );
}

function SingleSelect({ label, memberOptions, selected, onChange, disabledIds = [] }) {
  const toggle = (id) => {
    if (selected === id) onChange(null);
    else if (!disabledIds.includes(id)) onChange(id);
  };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-10 bg-white">
        {memberOptions.map(m => {
          const isSelected = selected === m.id;
          const isDisabled = !isSelected && disabledIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              disabled={isDisabled}
              title={isDisabled ? 'Already assigned elsewhere' : undefined}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : isDisabled
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {m.name}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="text-xs text-gray-500 mt-1">Selected: {memberOptions.find(m => m.id === selected)?.name}</p>
      )}
    </div>
  );
}

export default function LineupFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getLineupById, addLineup, updateLineup, addTemplate, members, canManageLineups,
    lineups, songs, templates, instrumentSlots, worshipLeaderRoles,
  } = useApp();

  const isEdit = id && id !== 'new';
  const existing = isEdit ? getLineupById(id) : null;
  const [searchParams] = useSearchParams();

  const coreInstrumentSlots = instrumentSlots.filter(s => s.core && s.id !== 'soundEngineer');
  const nonCoreSlots = instrumentSlots.filter(s => !s.core);
  const soundEngineerSlot = instrumentSlots.find(s => s.id === 'soundEngineer');

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
    instrumentAssignments: {},
    activeExtraSlotIds: [],
    setListUrl: '',
    practiceDate: '',
    practiceTiming: 'after',
    nextWL: '',
    bibleVerse: '',
    songs: [],
    notes: '',
  };

  const [form, setForm] = useState(existing ? buildFormFromLineup(existing, instrumentSlots) : emptyForm);
  const [saved, setSaved] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateApplied, setTemplateApplied] = useState(false);
  const [showSaveTemplatePanel, setShowSaveTemplatePanel] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);
  const [templateDraft, setTemplateDraft] = useState({ name: '', description: '' });

  // Re-apply existing lineup data when lineups load from Firestore after mount
  // (e.g. page refreshed directly on /lineup/:id/edit before snapshot arrives).
  // Guard with existing?.date so we only trigger when the lineup actually loads,
  // not on every render, and don't overwrite user edits once the form is populated.
  useEffect(() => {
    if (existing) setForm(buildFormFromLineup(existing, instrumentSlots));
  }, [id, existing?.date]);

  // Song library: canonical songs first, then unique songs from past lineups
  const songLibrary = useMemo(() => {
    const canonicalMap = {};
    for (const song of songs) {
      const key = song.title?.trim().toLowerCase();
      if (!key) continue;
      canonicalMap[key] = {
        title: song.title.trim(),
        section: song.tags?.[0] || 'Other',
        youtubeUrl: song.youtubeUrl || '',
        defaultKey: song.defaultKey || '',
        count: 0,
        isCanonical: true,
      };
    }

    const historyMap = {};
    for (const l of lineups) {
      for (const s of l.songs || []) {
        const key = s.title.trim().toLowerCase();
        if (!key) continue;

        if (canonicalMap[key]) {
          canonicalMap[key].count++;
          if (s.youtubeUrl && !canonicalMap[key].youtubeUrl) canonicalMap[key].youtubeUrl = s.youtubeUrl;
          if (s.section && canonicalMap[key].section === 'Other') canonicalMap[key].section = s.section;
          continue;
        }

        if (!historyMap[key]) {
          historyMap[key] = {
            title: s.title.trim(),
            section: s.section,
            youtubeUrl: s.youtubeUrl || '',
            defaultKey: s.key || '',
            count: 0,
            isCanonical: false,
          };
        }
        historyMap[key].count++;
        if (s.youtubeUrl) historyMap[key].youtubeUrl = s.youtubeUrl;
        if (s.key && !historyMap[key].defaultKey) historyMap[key].defaultKey = s.key;
      }
    }

    return [
      ...Object.values(canonicalMap).sort((a, b) => a.title.localeCompare(b.title)),
      ...Object.values(historyMap).sort((a, b) => b.count - a.count),
    ];
  }, [lineups, songs]);

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

  // Conflict detection & validation warnings
  const validationWarnings = useMemo(() => {
    const warnings = [];

    // --- 1. Duplicate member assignment detection ---
    // Build a map: memberId → list of role labels they appear in
    const roleMap = {}; // memberId → string[]

    const addToMap = (memberId, roleLabel) => {
      if (!memberId) return;
      if (!roleMap[memberId]) roleMap[memberId] = [];
      roleMap[memberId].push(roleLabel);
    };

    // Worship leaders
    (form.worshipLeaders || []).forEach(wl => {
      if (wl.memberId) addToMap(wl.memberId, 'Worship Leader');
    });

    // Back-up vocalists
    (form.backUps || []).forEach(id => addToMap(id, 'Back Up'));

    // Every instrument slot (core + any active extras)
    instrumentSlots.forEach(slot => {
      (form.instrumentAssignments[slot.id] || []).forEach(id => addToMap(id, slot.label));
    });

    // Emit a warning for every member assigned to 2+ roles
    Object.entries(roleMap).forEach(([memberId, roles]) => {
      if (roles.length > 1) {
        // Team A allows the same person to hold multiple worship leader slots
        if (form.isTeamA && roles.every(r => r === 'Worship Leader')) return;
        const name = members.find(m => m.id === memberId)?.name || memberId;
        warnings.push(`${name} is assigned to multiple roles: ${roles.join(', ')}`);
      }
    });

    // --- 2. Missing critical roles ---
    const hasWL = (form.worshipLeaders || []).some(wl => wl.memberId);
    if (!hasWL) warnings.push('No worship leader selected');

    const hasSoundEngineer = (form.instrumentAssignments.soundEngineer || []).length > 0;
    if (instrumentSlots.some(s => s.id === 'soundEngineer') && !hasSoundEngineer) {
      warnings.push('No sound engineer selected');
    }

    return warnings;
  }, [form, members, instrumentSlots]);

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

  if (!canManageLineups) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">🔐</div>
        <p>You need to be an admin to create or edit lineups.</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">Back to Schedule</button>
      </div>
    );
  }

  // Filtered member lists by role (guard against members with no roles array)
  const vocalists = members.filter(m => Array.isArray(m.roles) && m.roles.includes(ROLE_CATEGORIES.VOCALIST));
  // Back-up vocalists: members tagged as Back Up OR Vocalist
  const backUpVocalists = members.filter(m => Array.isArray(m.roles) && (
    m.roles.includes(ROLE_CATEGORIES.BACK_UP) || m.roles.includes(ROLE_CATEGORIES.VOCALIST)
  ));

  // Build the full set of all currently assigned member IDs across every slot.
  // Used to disable already-assigned members in other selectors.
  const nonWlAssignedIds = new Set([
    ...(form.backUps || []),
    ...Object.values(form.instrumentAssignments || {}).flat(),
  ]);
  const allAssignedIds = new Set([
    ...(form.worshipLeaders || []).map(wl => wl.memberId).filter(Boolean),
    ...nonWlAssignedIds,
  ]);
  // Helper: returns disabled IDs for a given slot's own current selection(s)
  // so that a member's own slot never disables itself.
  const disabledFor = (ownIds) => {
    const own = new Set(Array.isArray(ownIds) ? ownIds : (ownIds ? [ownIds] : []));
    return [...allAssignedIds].filter(id => !own.has(id));
  };

  const updateInstrumentSlot = (slotId, value) => {
    setForm(f => ({ ...f, instrumentAssignments: { ...f.instrumentAssignments, [slotId]: value } }));
  };

  const availableExtraSlots = nonCoreSlots.filter(s => !form.activeExtraSlotIds.includes(s.id));

  const getSlotDisplay = (slotId) => {
    const slot = instrumentSlots.find(s => s.id === slotId);
    if (slot) return { label: slot.label };
    return { label: slotId.startsWith('legacy-') ? slotId.slice(7) : slotId };
  };

  const addExtraRow = () => {
    const next = availableExtraSlots[0];
    if (!next) return;
    setForm(f => ({
      ...f,
      activeExtraSlotIds: [...f.activeExtraSlotIds, next.id],
      instrumentAssignments: { ...f.instrumentAssignments, [next.id]: [] },
    }));
  };

  const removeExtraRow = (rowIndex) => {
    setForm(f => {
      const slotId = f.activeExtraSlotIds[rowIndex];
      const newAssignments = { ...f.instrumentAssignments };
      delete newAssignments[slotId];
      return {
        ...f,
        activeExtraSlotIds: f.activeExtraSlotIds.filter((_, i) => i !== rowIndex),
        instrumentAssignments: newAssignments,
      };
    });
  };

  const updateExtraRowSlot = (rowIndex, newSlotId) => {
    setForm(f => {
      const oldSlotId = f.activeExtraSlotIds[rowIndex];
      const movedMemberIds = f.instrumentAssignments[oldSlotId] || [];
      const newAssignments = { ...f.instrumentAssignments };
      delete newAssignments[oldSlotId];
      newAssignments[newSlotId] = movedMemberIds;
      return {
        ...f,
        activeExtraSlotIds: f.activeExtraSlotIds.map((id, i) => i === rowIndex ? newSlotId : id),
        instrumentAssignments: newAssignments,
      };
    });
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

  const handleApplyTemplate = () => {
    const selectedTemplate = templates.find(template => template.id === selectedTemplateId);
    if (!selectedTemplate) return;

    const assignments = normalizeLineupInstruments(selectedTemplate, instrumentSlots);
    setForm(f => ({
      ...f,
      worshipLeaders: selectedTemplate.worshipLeaders || [{ memberId: '', role: 'Worship Leader' }],
      backUps: selectedTemplate.backUps || [],
      instrumentAssignments: assignments,
      activeExtraSlotIds: deriveActiveExtraSlotIds(assignments, instrumentSlots),
      notes: selectedTemplate.notes || '',
    }));
    setTemplateApplied(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateDraft.name.trim()) return;

    await addTemplate({
      name: templateDraft.name.trim(),
      description: templateDraft.description.trim(),
      isTeamA: form.isTeamA,
      worshipLeaders: form.worshipLeaders,
      backUps: form.backUps,
      instrumentAssignments: form.instrumentAssignments,
      notes: form.notes,
    });

    setTemplateSaveSuccess(true);
    setShowSaveTemplatePanel(false);
    setTemplateDraft({ name: '', description: '' });
  };

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
      const targetId = newId || `lineup-${form.date}`;
      setTimeout(() => navigate(`/lineup/${targetId}`), 500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sticky header: Back | Title | Save */}
      <div className="sticky top-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 -mx-4 px-4 py-3 mb-5 flex items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="text-primary-600 hover:underline text-sm flex items-center gap-1 flex-shrink-0">
          <ChevronLeft size={16} /> Back
        </button>
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">
          {isEdit ? 'Edit Lineup' : 'New Lineup'}
        </h2>
        <button
          type="submit"
          form="lineup-form"
          disabled={saved}
          className={`btn-primary text-sm py-1.5 px-4 flex-shrink-0 ${saved ? 'opacity-70' : ''}`}
        >
          {saved ? '✅ Saved!' : isEdit ? 'Save' : 'Create'}
        </button>
      </div>

      <form id="lineup-form" onSubmit={handleSubmit} className="space-y-6">

        {!isEdit && templates.length > 0 && (
          <div className="card space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <LayoutTemplate size={14} className="text-primary-500" /> Apply a Template
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="input flex-1"
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
              >
                <option value="">— Select Template —</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId}
                className="btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
            {templateApplied && (
              <p className="text-xs text-green-600 font-medium">✅ Template applied — fill in the date and songs</p>
            )}
          </div>
        )}

      {/* Basic Info */}
        <div className="card space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <ClipboardList size={14} className="text-primary-500" /> Service Info
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <div>
                <label className="label">Practice Date</label>
                <input type="date" className="input" value={form.practiceDate}
                  onChange={e => setForm(f => ({ ...f, practiceDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Practice Timing</label>
                <select
                  className="input"
                  value={form.practiceTiming || 'after'}
                  onChange={e => setForm(f => ({ ...f, practiceTiming: e.target.value }))}
                >
                  {PRACTICE_TIMING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
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
            <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-start">
              <div className="flex-1">
                <select className="input" value={wl.memberId}
                  onChange={e => updateWL(i, 'memberId', e.target.value)}>
                  <option value="">— Select Member —</option>
                  {vocalists.map(m => {
                    const isDisabled = m.id !== wl.memberId && (form.isTeamA ? nonWlAssignedIds.has(m.id) : allAssignedIds.has(m.id));
                    return (
                      <option key={m.id} value={m.id} disabled={isDisabled}>
                        {m.name}{isDisabled ? ' (assigned)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex gap-2 items-center flex-1">
                {form.isTeamA ? (
                  <select className="input flex-1" value={wl.role}
                    onChange={e => updateWL(i, 'role', e.target.value)}>
                    {worshipLeaderRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <input type="text" className="input flex-1" placeholder="Role (optional)"
                    value={wl.role} onChange={e => updateWL(i, 'role', e.target.value)} />
                )}
                {form.worshipLeaders.length > 1 && (
                  <button type="button" onClick={() => removeWL(i)}
                    className="text-red-400 hover:text-red-600 text-xl flex-shrink-0">×</button>
                )}
              </div>
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
            memberOptions={backUpVocalists}
            selected={form.backUps}
            onChange={val => setForm(f => ({ ...f, backUps: val }))}
            disabledIds={disabledFor(form.backUps)}
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
                onClick={() => {
                  const assignments = normalizeLineupInstruments(prevLineup, instrumentSlots);
                  setForm(f => ({
                    ...f,
                    instrumentAssignments: assignments,
                    activeExtraSlotIds: deriveActiveExtraSlotIds(assignments, instrumentSlots),
                  }));
                }}
                className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
              >
                <Copy size={12} /> Copy from {prevLineup.date}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coreInstrumentSlots.map(slot => {
              const selected = form.instrumentAssignments[slot.id] || [];
              const eligibleMembers = slot.category
                ? members.filter(m => Array.isArray(m.roles) && m.roles.includes(slot.category))
                : members;
              return slot.multiSelect ? (
                <MultiSelect key={slot.id} label={slot.label} memberOptions={eligibleMembers}
                  selected={selected} onChange={v => updateInstrumentSlot(slot.id, v)}
                  disabledIds={disabledFor(selected)} />
              ) : (
                <SingleSelect key={slot.id} label={slot.label} memberOptions={eligibleMembers}
                  selected={selected[0] || ''} onChange={v => updateInstrumentSlot(slot.id, v ? [v] : [])}
                  disabledIds={disabledFor(selected[0] || null)} />
              );
            })}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <Link size={14} className="text-primary-500" /> Set List URL (optional)
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://docs.google.com/... or any set list link"
              value={form.setListUrl || ''}
              onChange={e => setForm(f => ({ ...f, setListUrl: e.target.value }))}
            />
          </div>
        </div>

        {/* Sound Engineer */}
        {soundEngineerSlot && (
          <div className="card">
            <SingleSelect
              label={<span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1"><SlidersHorizontal size={14} className="text-primary-500" /> {soundEngineerSlot.label}</span>}
              memberOptions={soundEngineerSlot.category
                ? members.filter(m => Array.isArray(m.roles) && m.roles.includes(soundEngineerSlot.category))
                : members}
              selected={(form.instrumentAssignments.soundEngineer || [])[0] || ''}
              onChange={v => updateInstrumentSlot('soundEngineer', v ? [v] : [])}
              disabledIds={disabledFor((form.instrumentAssignments.soundEngineer || [])[0] || null)}
            />
          </div>
        )}

        {/* Additional Instruments */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Music2 size={14} className="text-primary-500" /> Additional Instruments
            </h3>
            <button
              type="button"
              onClick={addExtraRow}
              disabled={availableExtraSlots.length === 0}
              className="text-primary-600 hover:underline text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={13} /> Add Instrument
            </button>
          </div>
          {form.activeExtraSlotIds.length === 0 && (
            <p className="text-xs text-gray-400">No additional instruments. Click "Add Instrument" to include violin, trumpet, etc.</p>
          )}
          {form.activeExtraSlotIds.map((slotId, ei) => {
            const display = getSlotDisplay(slotId);
            const knownSlot = nonCoreSlots.some(s => s.id === slotId);
            const rowOptions = nonCoreSlots.filter(s => s.id === slotId || !form.activeExtraSlotIds.includes(s.id));
            const memberIds = form.instrumentAssignments[slotId] || [];
            return (
              <div key={ei} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <select
                    className={`${ci} flex-1`}
                    value={slotId}
                    onChange={e => updateExtraRowSlot(ei, e.target.value)}
                  >
                    {!knownSlot && <option value={slotId}>{display.label} (removed)</option>}
                    {rowOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeExtraRow(ei)}
                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* Member multi-select */}
                <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-md bg-white min-h-8">
                  {members.map(m => {
                    const selected = memberIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateInstrumentSlot(
                          slotId,
                          selected ? memberIds.filter(mid => mid !== m.id) : [...memberIds, m.id]
                        )}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          selected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
                {memberIds.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Selected: {memberIds.map(mid => members.find(m => m.id === mid)?.name).filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Songs */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen size={14} className="text-primary-500" /> Songs
            </h3>
            <button type="button" onClick={() => setForm(f => ({
              ...f,
              songs: [{ section: 'Praise and Worship', title: '', youtubeUrl: '' }, ...(f.songs || [])]
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

        {/* Validation Summary Panel */}
        {validationWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wide">
                <AlertTriangle size={13} className="text-amber-500" /> Lineup Warnings
              </span>
              <span className="inline-flex items-center justify-center rounded-full bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 leading-none">
                {validationWarnings.length} {validationWarnings.length === 1 ? 'issue' : 'issues'} found
              </span>
            </div>
            <ul className="space-y-1">
              {validationWarnings.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                  <AlertTriangle size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-600 italic">You can still save — these are advisory warnings only.</p>
          </div>
        )}

        {canManageLineups && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Save size={14} className="text-primary-500" /> Save as Template
                </h3>
                {templateSaveSuccess && (
                  <p className="text-xs text-green-600 font-medium mt-2">✅ Template saved!</p>
                )}
              </div>
              {!showSaveTemplatePanel && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveTemplatePanel(true);
                    setTemplateSaveSuccess(false);
                  }}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Save size={14} /> Save as Template
                </button>
              )}
            </div>

            {showSaveTemplatePanel && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
                <div>
                  <label className="label">Template Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={templateDraft.name}
                    onChange={e => setTemplateDraft(draft => ({ ...draft, name: e.target.value }))}
                    placeholder="e.g. Sunday AM Service"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    className="input"
                    value={templateDraft.description}
                    onChange={e => setTemplateDraft(draft => ({ ...draft, description: e.target.value }))}
                    placeholder="Optional short description"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={!templateDraft.name.trim()}
                    className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Save Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveTemplatePanel(false);
                      setTemplateDraft({ name: '', description: '' });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
