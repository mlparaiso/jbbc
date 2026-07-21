# Editable Roles & Instruments — Plan 2: Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin add/edit/delete/reorder worship-leader role labels and instrument slots from the Team Setup page.

**Architecture:** A new `RolesInstrumentsSettings` component renders two managed lists (worship leader roles, instrument slots), each backed directly by `useApp().worshipLeaderRoles` / `useApp().instrumentSlots` and written via `useApp().updateAppConfig(...)`. It's mounted into the existing `TeamSetupPage.jsx`, following the same "list + inline add/edit + delete confirm" pattern already used there for Lineup Templates.

**Tech Stack:** React (Vite), Tailwind CSS, lucide-react icons. Plain JavaScript, no TypeScript.

## Global Constraints

- **Requires Plan 1 (foundation) to be merged first.** This plan consumes `worshipLeaderRoles`, `instrumentSlots`, and `updateAppConfig` from `useApp()`, and `ALLOWED_SLOT_ICONS`/`SlotIcon` from `src/data/instrumentIcons.jsx` — all added by Plan 1. If those don't exist yet, stop and run Plan 1 first.
- No test framework exists in this repo. Verification is manual: `npm run dev` + exercise the UI in the browser. Do not add a test framework.
- Plain JavaScript only — no TypeScript syntax.
- Follow existing conventions: reuse the `input`, `label`, `btn-primary`, `btn-secondary`, `card` Tailwind utility classes already used throughout `src/pages/TeamSetupPage.jsx` — don't invent new visual patterns for this feature.
- Editing is gated behind `canManageLineups` (main_admin or co_admin), matching the same gate already used for the Lineup Templates section in `TeamSetupPage.jsx`. This is deliberately the same tier the Firestore rule (`canWriteAppConfig`, added in Plan 1) allows — don't tighten it to `isMainAdmin` only, that would create a UI/rule mismatch where co_admins see a working button that silently fails, or no button at all when the rule would've allowed it.
- Deleting a role or slot does not touch any existing lineup document — it only removes it from the pickable list going forward. Confirm with `window.confirm(...)` before deleting, same as the existing template-delete flow.

---

### Task 1: `RolesInstrumentsSettings` component

**Files:**
- Create: `src/components/RolesInstrumentsSettings.jsx`

**Interfaces:**
- Consumes: `useApp()` → `worshipLeaderRoles`, `instrumentSlots`, `updateAppConfig` (from Plan 1's `AppContext.jsx`); `ALLOWED_SLOT_ICONS`, `SlotIcon` from `../data/instrumentIcons` (from Plan 1); `ROLE_CATEGORIES` from `../data/initialData` (already exists).
- Produces (consumed by Task 2 of this plan): a default-exported `RolesInstrumentsSettings` component taking no props, safe to render anywhere `useApp()` is available.

- [ ] **Step 1: Write the component**

Create `src/components/RolesInstrumentsSettings.jsx`:

```jsx
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
        {/* Disabling reorder/edit/delete on other rows while one is being edited prevents the
            array from shifting under an in-progress edit, which would otherwise let
            commitEditRole silently overwrite a different role by index. */}
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
```

- [ ] **Step 2: Verify the component has no syntax/import errors**

Run: `npm run lint` — expected: no new errors reported for `src/components/RolesInstrumentsSettings.jsx` (Task 2 below wires it into a page so it can be visually checked in the browser).

- [ ] **Step 3: Commit**

```bash
git add src/components/RolesInstrumentsSettings.jsx
git commit -m "feat: add RolesInstrumentsSettings admin CRUD component"
```

---

### Task 2: Wire into Team Setup page

**Files:**
- Modify: `src/pages/TeamSetupPage.jsx`

**Interfaces:**
- Consumes: `RolesInstrumentsSettings` default export from `../components/RolesInstrumentsSettings` (Task 1).

- [ ] **Step 1: Import the component**

In `src/pages/TeamSetupPage.jsx`, add this import after line 5 (`import TeamLogoUploader from '../components/TeamLogoUploader';`):

```js
import RolesInstrumentsSettings from '../components/RolesInstrumentsSettings';
```

- [ ] **Step 2: Render it in the admin section**

In `src/pages/TeamSetupPage.jsx`, the Lineup Templates block is the `{canManageLineups && ( <div className="bg-gray-50 rounded-lg p-3 space-y-3 text-left"> ... </div> )}` block that starts at line 165 and closes at line 251. Add a new sibling block right after that block closes (i.e. right after line 251, before the `<div className="flex gap-2 pt-2">` on line 253):

```jsx

          {canManageLineups && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <ListMusic size={15} className="text-primary-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-700">Roles & Instruments</p>
                  <p className="text-xs text-gray-400">Manage the worship-leader roles and instrument slots used on every lineup.</p>
                </div>
              </div>
              <RolesInstrumentsSettings />
            </div>
          )}
```

This needs the `ListMusic` icon imported too — add it to the existing lucide-react import on line 4:

```js
import { Music2, Plus, LogIn, Copy, Check, LogOut, RefreshCw, AlertTriangle, Users, Globe, Lock, Star, Trash2, LayoutTemplate, ListMusic } from 'lucide-react';
```

(This replaces the current line 4 import list, adding `ListMusic` at the end.)

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, sign in as a team admin (main_admin or co_admin), navigate to Team Setup. Confirm:
1. A new "Roles & Instruments" card appears below "Lineup Templates".
2. Under "Worship Leader Roles", the 6 default roles (Opening/Welcome, Praise, Worship, Lord's Table, Opening, Other) are listed.
3. Adding a new role (type text, click the `+` button) adds it to the bottom of the list immediately (no page reload needed — confirms the Firestore `onSnapshot` round-trip works).
4. Clicking the pencil icon on a role lets you rename it inline; clicking the trash icon prompts a confirm dialog and removes it on confirm.
5. Under "Instrument Slots", all 32 default slots are listed, each showing its icon, label, and a "Core"/"Optional" badge matching Task 1 of Plan 1's data (7 "Core", 25 "Optional").
6. Clicking "Add Slot" opens the inline form; filling in a label and clicking "Save" adds a new slot to the bottom of the list.
7. Sign out (or view as a non-admin member) and confirm the entire "Roles & Instruments" card is not rendered.

Expected: all of the above hold, and the browser console shows no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/TeamSetupPage.jsx
git commit -m "feat: surface Roles & Instruments settings on Team Setup page"
```
