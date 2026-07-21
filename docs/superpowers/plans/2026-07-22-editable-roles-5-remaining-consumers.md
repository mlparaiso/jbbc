# Editable Roles & Instruments — Plan 5: Remaining Consumer Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a gap discovered during Plan 3's task review: `SchedulePage.jsx`, `DashboardPage.jsx`, and `PublicSchedulePage.jsx` all read `lineup.instruments`/`lineup.soundEngineer` directly (some without even an `|| {}` guard), so any lineup created or edited through the now-config-driven `LineupFormPage.jsx` (Plan 3) — which no longer writes a top-level `instruments`/`soundEngineer` field — would render blank or, worse, crash these three pages.

**Architecture:** Same fix pattern already used in Plan 4 for the detail pages: replace direct `lineup.instruments`/`lineup.soundEngineer` reads with `normalizeLineupInstruments(lineup, instrumentSlots)` (from Plan 1), pulling `instrumentSlots` from `useApp()`. These three files only ever *read* instrument data for display/alerting — none of them need the fuller `SlotIcon`/dynamic-grid treatment used in the create/edit form or detail pages, since their instrument display is a compact inline pill list, not a full grid.

**Tech Stack:** React (Vite), Tailwind CSS, lucide-react icons. Plain JavaScript, no TypeScript.

## Global Constraints

- **Requires Plan 1 (foundation) to be merged first.** Consumes `instrumentSlots` from `useApp()` and `normalizeLineupInstruments` from `src/utils/normalizeLineupInstruments.js`.
- No test framework exists in this repo. Verification is manual (`npm run dev` + browser) or read-through where auth blocks a live check. Do not add a test framework.
- Plain JavaScript only.
- **Explicitly out of scope:** `SchedulePage.jsx`'s "Generate Month Schedule" feature (the `handleGenerate` function and its `copy`/`template`/`blank` modes, roughly lines 101-206) creates new lineup documents using the OLD field shape (`instruments: {k1: [], ...}`, `soundEngineer: ''`). This is left unchanged — it still produces valid data that `normalizeLineupInstruments` reads correctly, so there is no need to touch it, and doing so would be unrelated scope creep for this bug-fix plan. Only the *rendering* of instrument data in these three files is in scope.
- Do not change anything about these pages' month/year navigation, theme editing, alert categories other than "Incomplete band"'s data source, or any other feature — this plan is a narrow, surgical fix for the discovered data-shape mismatch, not a redesign.

---

### Task 1: `SchedulePage.jsx` — read instrument data through `normalizeLineupInstruments`

**Files:**
- Modify: `src/pages/SchedulePage.jsx`

**Interfaces:**
- Consumes: `useApp()` → `instrumentSlots` (Plan 1, add to the existing destructure); `normalizeLineupInstruments` from `../utils/normalizeLineupInstruments` (Plan 1).

- [ ] **Step 1: Import the normalizer and pull `instrumentSlots` from context**

In `src/pages/SchedulePage.jsx`, add this import after line 8 (`import { Piano, Guitar, Waves, Drum, SlidersHorizontal, Music2 } from 'lucide-react';`):

```js
import { normalizeLineupInstruments } from '../utils/normalizeLineupInstruments';
```

Then find this line (originally line 51):

```jsx
  const { lineups, canManageLineups, getMemberById, updateLineup, addLineups, templates, teamId } = useApp();
```

Replace it with:

```jsx
  const { lineups, canManageLineups, getMemberById, updateLineup, addLineups, templates, teamId, instrumentSlots } = useApp();
```

- [ ] **Step 2: Fix the print-view table's instrument columns**

In `src/pages/SchedulePage.jsx`, find this block inside the `monthLineups.map((l, i) => { ... })` for the print table (originally lines 286-295):

```jsx
              const wl = l.worshipLeaders.map(w => getMemberById(w.memberId)?.name || '—').join(', ');
              const bu = l.backUps.map(id => getMemberById(id)?.name).filter(Boolean).join(', ') || '—';
              const k1p = (l.instruments.k1 || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const k2p = (l.instruments.k2 || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const bp = (l.instruments.bass || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const lgp = (l.instruments.leadGuitar || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const agp = (l.instruments.acousticGuitar || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const dp = (l.instruments.drums || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const sep = getMemberById(l.soundEngineer)?.name || '—';
```

Replace it with:

```jsx
              const wl = l.worshipLeaders.map(w => getMemberById(w.memberId)?.name || '—').join(', ');
              const bu = l.backUps.map(id => getMemberById(id)?.name).filter(Boolean).join(', ') || '—';
              const lAssignments = normalizeLineupInstruments(l, instrumentSlots);
              const k1p = (lAssignments.k1 || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const k2p = (lAssignments.k2 || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const bp = (lAssignments.bass || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const lgp = (lAssignments.leadGuitar || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const agp = (lAssignments.acousticGuitar || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const dp = (lAssignments.drums || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '—';
              const sep = getMemberById(lAssignments.soundEngineer?.[0])?.name || '—';
```

- [ ] **Step 3: Fix the on-screen lineup list's instrument pills**

In `src/pages/SchedulePage.jsx`, find this block (originally lines 409-416):

```jsx
            const backupNames = lineup.backUps.map(id => getMemberById(id)?.name).filter(Boolean).join(', ');
            const k1 = lineup.instruments.k1?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const k2 = lineup.instruments.k2?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const bass = lineup.instruments.bass?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const lg = lineup.instruments.leadGuitar?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const ag = lineup.instruments.acousticGuitar?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const drums = lineup.instruments.drums?.map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const se = getMemberById(lineup.soundEngineer);
```

Replace it with:

```jsx
            const backupNames = lineup.backUps.map(id => getMemberById(id)?.name).filter(Boolean).join(', ');
            const assignments = normalizeLineupInstruments(lineup, instrumentSlots);
            const k1 = (assignments.k1 || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const k2 = (assignments.k2 || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const bass = (assignments.bass || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const lg = (assignments.leadGuitar || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const ag = (assignments.acousticGuitar || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const drums = (assignments.drums || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/') || '';
            const se = getMemberById(assignments.soundEngineer?.[0]);
```

Then find this line just below, inside the instrument-pills JSX (originally line 464):

```jsx
                    {(lineup.instruments.extras || []).map((extra, ei) => {
                      const names = (extra.memberIds || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/');
                      if (!names) return null;
                      return <InstrumentPill key={ei} icon={<Music2 size={10} />} name={`${extra.label}: ${names}`} iconClass="text-purple-400" />;
                    })}
```

Replace it with:

```jsx
                    {instrumentSlots.filter(s => !s.core && (assignments[s.id]?.length > 0)).map(slot => {
                      const names = (assignments[slot.id] || []).map(id => getMemberById(id)?.name).filter(Boolean).join('/');
                      return <InstrumentPill key={slot.id} icon={<Music2 size={10} />} name={`${slot.label}: ${names}`} iconClass="text-purple-400" />;
                    })}
```

(This drops the old `EXTRA_ICON_MAP`-style per-icon lookup in favor of a single `Music2` icon for every non-core pill — matching what this specific pill list already did before for every extra instrument, since `InstrumentPill` here never varied its icon per extra type in the first place.)

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, sign in as admin, go to the Schedule view for a month with seeded (old-format) lineups. Confirm:
1. Instrument pills (K1/K2/BG/LG/AG/D/SE) still show the correct seeded names, same as before this change.
2. Click "Print Month" (or open the print preview) and confirm the printable table's instrument columns still populate correctly for the same seeded lineups.
3. Using Plan 3's now-config-driven lineup form, create or edit a lineup, save it, and confirm it now appears correctly in this Schedule view too (this is the specific regression this task fixes — verify it doesn't crash or show blank instruments).

- [ ] **Step 5: Commit**

```bash
git add src/pages/SchedulePage.jsx
git commit -m "fix: read schedule view instrument data through normalizeLineupInstruments"
```

---

### Task 2: `DashboardPage.jsx` — "Incomplete band" alert reads normalized data

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: `useApp()` → `instrumentSlots` (Plan 1); `normalizeLineupInstruments` (Plan 1).

- [ ] **Step 1: Import the normalizer and pull `instrumentSlots` from context**

In `src/pages/DashboardPage.jsx`, add this import after line 16 (the closing `} from 'lucide-react';` of the icon import):

```js
import { normalizeLineupInstruments } from '../utils/normalizeLineupInstruments';
```

- [ ] **Step 2: Update `getAlerts` to take `instrumentSlots` and normalize before checking**

In `src/pages/DashboardPage.jsx`, find this function (originally lines 31-64):

```js
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
```

Replace it with:

```js
function getAlerts(lineup, instrumentSlots) {
  const alerts = [];

  // 1. Missing worship leader
  const hasWL =
    lineup.worshipLeaders &&
    lineup.worshipLeaders.length > 0 &&
    lineup.worshipLeaders.some((wl) => wl.memberId && wl.memberId.trim() !== '');
  if (!hasWL) alerts.push('Missing WL');

  const assignments = normalizeLineupInstruments(lineup, instrumentSlots);

  // 2. Missing sound engineer
  if (!(assignments.soundEngineer?.length > 0)) {
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

  // 5. Incomplete band — require k1, bass, drums
  const coreRoles = ['k1', 'bass', 'drums'];
  const missingCore = coreRoles.some((role) => !(assignments[role]?.length > 0));
  if (missingCore) alerts.push('Incomplete band');

  return alerts;
}
```

- [ ] **Step 3: Pass `instrumentSlots` at the call site**

In `src/pages/DashboardPage.jsx`, find this line (originally line 95):

```jsx
  const { lineups, getMemberById, canManageLineups } = useApp();
```

Replace it with:

```jsx
  const { lineups, getMemberById, canManageLineups, instrumentSlots } = useApp();
```

Then find this line (originally line 122):

```jsx
  const lineupAlerts = upcoming.map((l) => ({ lineup: l, alerts: getAlerts(l) }));
```

Replace it with:

```jsx
  const lineupAlerts = upcoming.map((l) => ({ lineup: l, alerts: getAlerts(l, instrumentSlots) }));
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, sign in as admin, go to Dashboard. Confirm:
1. Seeded lineups' alert pills (Missing WL / Missing SE / No songs / No practice date / Incomplete band) still show the same as before this change.
2. Create or edit a lineup via the (now config-driven) lineup form, leaving the sound engineer or a core instrument blank, save it, and confirm the corresponding alert pill appears correctly for it on the Dashboard (this is the regression this task fixes).

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "fix: read dashboard alert data through normalizeLineupInstruments"
```

---

### Task 3: `PublicSchedulePage.jsx` — public month view reads normalized data

**Files:**
- Modify: `src/pages/PublicSchedulePage.jsx`

**Interfaces:**
- Consumes: `useApp()` → `instrumentSlots` (Plan 1, publicly readable per Plan 1's Firestore rule); `normalizeLineupInstruments` (Plan 1).

- [ ] **Step 1: Import the normalizer and pull `instrumentSlots` from context**

In `src/pages/PublicSchedulePage.jsx`, add this import after line 6 (`import DonateSection from '../components/DonateSection';`):

```js
import { normalizeLineupInstruments } from '../utils/normalizeLineupInstruments';
```

Then find this line (originally line 30):

```jsx
  const { loadPublicTeam, publicTeam, publicLineups, publicMembers, publicLoading, publicError } = useApp();
```

Replace it with:

```jsx
  const { loadPublicTeam, publicTeam, publicLineups, publicMembers, publicLoading, publicError, instrumentSlots } = useApp();
```

- [ ] **Step 2: Fix the month-detail card's instrument pills**

In `src/pages/PublicSchedulePage.jsx`, find this block (originally lines 265-272):

```jsx
                  const backupNames = (lineup.backUps || []).map(id => getMemberName(id)).filter(Boolean).join(', ');
                  const k1 = (lineup.instruments?.k1 || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const k2 = (lineup.instruments?.k2 || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const bass = (lineup.instruments?.bass || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const lg = (lineup.instruments?.leadGuitar || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const ag = (lineup.instruments?.acousticGuitar || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const drums = (lineup.instruments?.drums || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const seName = getMemberName(lineup.soundEngineer);
```

Replace it with:

```jsx
                  const backupNames = (lineup.backUps || []).map(id => getMemberName(id)).filter(Boolean).join(', ');
                  const assignments = normalizeLineupInstruments(lineup, instrumentSlots);
                  const k1 = (assignments.k1 || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const k2 = (assignments.k2 || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const bass = (assignments.bass || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const lg = (assignments.leadGuitar || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const ag = (assignments.acousticGuitar || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const drums = (assignments.drums || []).map(id => getMemberName(id)).filter(Boolean).join('/');
                  const seName = getMemberName(assignments.soundEngineer?.[0]);
```

- [ ] **Step 3: Manual verification**

In an incognito/private browser window, navigate to a public schedule link (`/team/{teamId}`) for a team with `isPublic: true`, and drill into a month with seeded lineups. Confirm:
1. Instrument pills show the same names as the signed-in Schedule view for the same lineups.
2. No console errors — this also re-confirms Plan 1's Firestore rule allows unauthenticated reads of `config/appConfig` (already checked in Plan 4, but this is a second independent code path exercising the same rule).

- [ ] **Step 4: Commit**

```bash
git add src/pages/PublicSchedulePage.jsx
git commit -m "fix: read public schedule instrument data through normalizeLineupInstruments"
```
