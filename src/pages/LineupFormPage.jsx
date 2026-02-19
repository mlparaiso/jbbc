import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { INSTRUMENT_ROLES, ROLE_CATEGORIES } from '../data/initialData';

const TEAM_A_ROLES = ["OpWelcome", "Praise", "Worship", "Lord's Table", "Opening", "Other"];

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
  const { getLineupById, addLineup, updateLineup, members, isAdmin } = useApp();

  const isEdit = id && id !== 'new';
  const existing = isEdit ? getLineupById(id) : null;

  const emptyForm = {
    date: '',
    isTeamA: false,
    theme: '',
    worshipLeaders: [{ memberId: '', role: 'Worship Leader' }],
    backUps: [],
    instruments: { k1: [], k2: [], bass: [], leadGuitar: [], acousticGuitar: [], drums: [] },
    soundEngineer: '',
    practiceDate: '',
    notes: '',
  };

  const [form, setForm] = useState(existing || emptyForm);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing) setForm(existing);
  }, [id]);

  if (!isAdmin) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">🔐</div>
        <p>You need to be an admin to create or edit lineups.</p>
        <button onClick={() => navigate('/admin')} className="btn-primary mt-4">Admin Login</button>
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date) return alert('Please select a date.');
    if (isEdit) {
      updateLineup(id, form);
    } else {
      addLineup(form);
    }
    setSaved(true);
    setTimeout(() => navigate('/'), 800);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-primary-600 hover:underline text-sm mb-4 flex items-center gap-1">
        ‹ Back
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? '✏️ Edit Lineup' : '+ New Lineup'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <div className="card space-y-4">
          <h3 className="font-bold text-gray-700">📋 Service Info</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Service Date *</label>
              <input type="date" className="input" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
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
          <h3 className="font-bold text-gray-700">🎤 Worship Leader(s)</h3>
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
            label="🎵 Back Ups"
            memberOptions={vocalists}
            selected={form.backUps}
            onChange={val => setForm(f => ({ ...f, backUps: val }))}
          />
        </div>

        {/* Instruments */}
        <div className="card space-y-4">
          <h3 className="font-bold text-gray-700">🎸 Instrumentalists</h3>

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
          <SingleSelect label="🎚 Sound Engineer (SE)" memberOptions={soundEngineers}
            selected={form.soundEngineer} onChange={v => setForm(f => ({ ...f, soundEngineer: v }))} />
        </div>

        {/* Notes */}
        <div className="card">
          <label className="label">📝 Notes (optional)</label>
          <textarea className="input" rows={3} placeholder="Any special notes..."
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
