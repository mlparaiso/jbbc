import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ListMusic, Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Check } from 'lucide-react';
import { ALLOWED_SLOT_ICONS, SlotIcon } from '../data/instrumentIcons';
import { ROLE_CATEGORIES } from '../data/initialData';

function moveItem(arr, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function makeSlotId(label, existingIds) {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'slot';
  let id = base;
  let n = 2;
  while (existingIds.includes(id)) { id = `${base}-${n}`; n++; }
  return id;
}

function SlotForm({ slotForm, setSlotForm, onSave, onCancel }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          className="input py-1 w-28 flex-shrink-0"
          value={slotForm.icon}
          onChange={e => setSlotForm(f => ({ ...f, icon: e.target.value }))}
        >
          {ALLOWED_SLOT_ICONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
        </select>
        <input
          type="text"
          className="input flex-1 py-1"
          placeholder="Label, e.g. Tambourine"
          value={slotForm.label}
          onChange={e => setSlotForm(f => ({ ...f, label: e.target.value }))}
          autoFocus
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={slotForm.core}
            onChange={e => setSlotForm(f => ({ ...f, core: e.target.checked }))}
            className="w-3.5 h-3.5 accent-primary-600" />
          Core (always shown)
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={slotForm.multiSelect}
            onChange={e => setSlotForm(f => ({ ...f, multiSelect: e.target.checked }))}
            className="w-3.5 h-3.5 accent-primary-600" />
          Allow multiple members
        </label>
      </div>
      <select
        className="input py-1"
        value={slotForm.category}
        onChange={e => setSlotForm(f => ({ ...f, category: e.target.value }))}
      >
        <option value="">Any member (no filter)</option>
        {Object.values(ROLE_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
      </select>
      <div className="flex gap-2">
        <button type="button" onClick={onSave} disabled={!slotForm.label.trim()}
          className="btn-primary flex-1 text-xs py-1.5 disabled:opacity-60 disabled:cursor-not-allowed">
          Save
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5">Cancel</button>
      </div>
    </div>
  );
}

export default function RolesInstrumentsSettings() {
  const { worshipLeaderRoles, instrumentSlots, updateAppConfig } = useApp();

  // ---- Worship Leader Roles ----
  const [newRole, setNewRole] = useState('');
  const [editingRoleIndex, setEditingRoleIndex] = useState(null);
  const [editingRoleValue, setEditingRoleValue] = useState('');

  const saveRoles = (next) => updateAppConfig({ worshipLeaderRoles: next });

  const addRole = () => {
    const value = newRole.trim();
    if (!value || worshipLeaderRoles.includes(value)) return;
    saveRoles([...worshipLeaderRoles, value]);
    setNewRole('');
  };

  const startEditRole = (i) => { setEditingRoleIndex(i); setEditingRoleValue(worshipLeaderRoles[i]); };

  const commitEditRole = () => {
    const value = editingRoleValue.trim();
    if (!value) return;
    saveRoles(worshipLeaderRoles.map((r, i) => i === editingRoleIndex ? value : r));
    setEditingRoleIndex(null);
    setEditingRoleValue('');
  };

  const deleteRole = (i) => {
    if (!window.confirm(`Delete the "${worshipLeaderRoles[i]}" role? Existing lineups keep their saved role text.`)) return;
    saveRoles(worshipLeaderRoles.filter((_, idx) => idx !== i));
  };

  const reorderRole = (i, direction) => saveRoles(moveItem(worshipLeaderRoles, i, direction));

  // ---- Instrument Slots ----
  const [editingSlotId, setEditingSlotId] = useState(null); // null = not editing, 'new' = creating
  const [slotForm, setSlotForm] = useState({ label: '', icon: ALLOWED_SLOT_ICONS[0], multiSelect: true, core: false, category: '' });

  const saveSlots = (next) => updateAppConfig({ instrumentSlots: next });

  const startNewSlot = () => {
    setEditingSlotId('new');
    setSlotForm({ label: '', icon: ALLOWED_SLOT_ICONS[0], multiSelect: true, core: false, category: '' });
  };

  const startEditSlot = (slot) => {
    setEditingSlotId(slot.id);
    setSlotForm({ label: slot.label, icon: slot.icon, multiSelect: slot.multiSelect, core: slot.core, category: slot.category || '' });
  };

  const cancelSlotEdit = () => setEditingSlotId(null);

  const commitSlot = () => {
    const label = slotForm.label.trim();
    if (!label) return;
    const category = slotForm.category || null;
    if (editingSlotId === 'new') {
      const id = makeSlotId(label, instrumentSlots.map(s => s.id));
      saveSlots([...instrumentSlots, { id, label, icon: slotForm.icon, multiSelect: slotForm.multiSelect, core: slotForm.core, category }]);
    } else {
      saveSlots(instrumentSlots.map(s => s.id === editingSlotId
        ? { ...s, label, icon: slotForm.icon, multiSelect: slotForm.multiSelect, core: slotForm.core, category }
        : s));
    }
    setEditingSlotId(null);
  };

  const deleteSlot = (id) => {
    if (!window.confirm('Delete this instrument slot? Existing lineups keep their saved data but it will no longer display for this slot.')) return;
    saveSlots(instrumentSlots.filter(s => s.id !== id));
  };

  const reorderSlot = (i, direction) => saveSlots(moveItem(instrumentSlots, i, direction));

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-4 text-left">
      {/* Worship Leader Roles */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ListMusic size={15} className="text-primary-500" />
          <div>
            <p className="text-xs font-semibold text-gray-700">Worship Leader Roles</p>
            <p className="text-xs text-gray-400">Role labels offered on Team A Sundays (Opening, Praise, Worship, etc.)</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {worshipLeaderRoles.map((role, i) => (
            <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
              {editingRoleIndex === i ? (
                <>
                  <input
                    type="text"
                    className="input flex-1 py-1"
                    value={editingRoleValue}
                    onChange={e => setEditingRoleValue(e.target.value)}
                    autoFocus
                  />
                  <button type="button" onClick={commitEditRole} className="text-green-500 hover:text-green-600"><Check size={15} /></button>
                  <button type="button" onClick={() => setEditingRoleIndex(null)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-700">{role}</span>
                  <button type="button" onClick={() => reorderRole(i, -1)} disabled={i === 0 || editingRoleIndex !== null} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => reorderRole(i, 1)} disabled={i === worshipLeaderRoles.length - 1 || editingRoleIndex !== null} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown size={13} /></button>
                  <button type="button" onClick={() => startEditRole(i)} disabled={editingRoleIndex !== null} className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"><Pencil size={13} /></button>
                  <button type="button" onClick={() => deleteRole(i)} disabled={editingRoleIndex !== null} className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1 py-1"
            placeholder="Add a role, e.g. Special Number"
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
          />
          <button type="button" onClick={addRole} disabled={!newRole.trim()} className="btn-secondary text-xs px-3 disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Instrument Slots */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListMusic size={15} className="text-primary-500" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Instrument Slots</p>
              <p className="text-xs text-gray-400">"Core" slots always show on the lineup form; others are picked via "Add Instrument".</p>
            </div>
          </div>
          {editingSlotId === null && (
            <button type="button" onClick={startNewSlot} className="text-primary-600 hover:underline text-xs flex items-center gap-1">
              <Plus size={13} /> Add Slot
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {instrumentSlots.map((slot, i) => (
            <div key={slot.id} className="border border-gray-200 rounded-lg bg-white p-2">
              {editingSlotId === slot.id ? (
                <SlotForm slotForm={slotForm} setSlotForm={setSlotForm} onSave={commitSlot} onCancel={cancelSlotEdit} />
              ) : (
                <div className="flex items-center gap-2">
                  <SlotIcon name={slot.icon} size={15} className="text-primary-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{slot.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${slot.core ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {slot.core ? 'Core' : 'Optional'}
                  </span>
                  <button type="button" onClick={() => reorderSlot(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-30"><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => reorderSlot(i, 1)} disabled={i === instrumentSlots.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-30"><ArrowDown size={13} /></button>
                  <button type="button" onClick={() => startEditSlot(slot)} className="text-gray-400 hover:text-primary-600"><Pencil size={13} /></button>
                  <button type="button" onClick={() => deleteSlot(slot.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
          {editingSlotId === 'new' && (
            <div className="border border-primary-200 rounded-lg bg-white p-2">
              <SlotForm slotForm={slotForm} setSlotForm={setSlotForm} onSave={commitSlot} onCancel={cancelSlotEdit} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
