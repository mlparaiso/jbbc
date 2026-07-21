# Editable Roles & Instruments — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the data model, Firestore rules, and app-wide context wiring that let worship-leader role labels and instrument slots be read from a single global, admin-editable config instead of hardcoded arrays.

**Architecture:** A new Firestore document `config/appConfig` holds `worshipLeaderRoles: string[]` and `instrumentSlots: Slot[]`. `AppContext.jsx` listens to it via `onSnapshot` (same pattern as team/members/lineups) and exposes `worshipLeaderRoles`/`instrumentSlots` with hardcoded-default fallbacks, plus `updateAppConfig(patch)` to write. A `normalizeLineupInstruments()` utility maps old lineup documents (fixed `k1`/`k2`/`bass`/... keys, a separate `soundEngineer` field, and an `extras` array) onto the new dynamic `{ [slotId]: memberId[] }` shape at read time — no historical Firestore documents are rewritten.

**Tech Stack:** React (Vite), Firebase/Firestore (`firebase` JS SDK v9 modular API), Tailwind CSS, lucide-react icons. Plain JavaScript, no TypeScript.

## Global Constraints

- No test framework exists in this repo (no vitest/jest/testing-library, `package.json` scripts are only `dev`/`build`/`lint`/`preview`). Do not add one. Every step's "verify" action is either a manual `npm run dev` browser check or a throwaway `node` command — never a persisted test file.
- Plain JavaScript only — no TypeScript syntax, no type annotations.
- This is a live production app with real scheduling data in Firestore. Do not write any code that mutates, migrates, or rewrites existing `teams/{teamId}/lineups/*` or `teams/{teamId}/templates/*` documents. Old documents must keep rendering correctly forever via `normalizeLineupInstruments`.
- The app is genuinely multi-tenant (`teams/{teamId}` documents, invite codes, multiple churches/orgs could use it) but the user explicitly chose a **single global, non-team-scoped** config for roles/instrument slots rather than per-team. This means any admin (main_admin or co_admin) of *any* team can edit the shared config used by *every* team. This was a conscious tradeoff made by the project owner, not an oversight — do not "fix" it by making it per-team.
- Follow existing conventions: functional components with hooks, Tailwind utility classes (`input`, `label`, `btn-primary`, `btn-secondary`, `card` are existing custom classes — reuse them, don't invent new ones), lucide-react for icons, Firestore access only through `src/context/AppContext.jsx` (never call Firestore directly from page components).
- This plan (Plan 1) must land before Plan 2 (admin UI), Plan 3 (lineup form), or Plan 4 (display pages) — they all consume `worshipLeaderRoles`/`instrumentSlots`/`updateAppConfig` from `AppContext` and the `normalizeLineupInstruments`/icon utilities created here.

---

### Task 1: Shared instrument icon map + default config data

**Files:**
- Create: `src/data/instrumentIcons.jsx`
- Create: `src/data/defaultAppConfig.js`

**Interfaces:**
- Produces (consumed by Plans 2, 3, 4): `ALLOWED_SLOT_ICONS: string[]` (icon name choices), `SlotIcon({ name, size, className })` component (renders the right lucide icon for a stored icon-name string, from `src/data/instrumentIcons.jsx`), `DEFAULT_WORSHIP_LEADER_ROLES: string[]` and `DEFAULT_INSTRUMENT_SLOTS: Array<{ id, label, icon, multiSelect, core, category }>` (from `src/data/defaultAppConfig.js`).

- [ ] **Step 1: Create the shared icon map**

Create `src/data/instrumentIcons.jsx`:

```jsx
import { Piano, Guitar, Waves, Drum, Mic2, SlidersHorizontal, Music2, AudioLines, Bell, Repeat2, Music4 } from 'lucide-react';

// Fixed icon choices offered when creating/editing an instrument slot.
// Kept as a closed set (not free text) so a typo can never silently break rendering.
export const ALLOWED_SLOT_ICONS = [
  'Piano', 'Guitar', 'Waves', 'Drum', 'Mic2', 'SlidersHorizontal',
  'Music2', 'AudioLines', 'Bell', 'Repeat2', 'Music4',
];

const ICON_COMPONENTS = { Piano, Guitar, Waves, Drum, Mic2, SlidersHorizontal, Music2, AudioLines, Bell, Repeat2, Music4 };

// Renders the lucide icon for a stored icon-name string. Falls back to Music2
// for any name outside ALLOWED_SLOT_ICONS (e.g. a legacy value).
export function SlotIcon({ name, size = 14, className }) {
  const Cmp = ICON_COMPONENTS[name] || Music2;
  return <Cmp size={size} className={className} />;
}
```

- [ ] **Step 2: Create the default config data**

Create `src/data/defaultAppConfig.js`:

```js
import { ROLE_CATEGORIES } from './initialData';

// Default worship-leader roles and instrument slots.
// Used whenever config/appConfig hasn't been customized yet (or doesn't exist),
// so behavior is unchanged from today until an admin edits Roles & Instruments
// in Team Setup.

export const DEFAULT_WORSHIP_LEADER_ROLES = [
  'Opening/Welcome',
  'Praise',
  'Worship',
  "Lord's Table",
  'Opening',
  'Other',
];

// `category` (optional) filters which members show up in a slot's picker,
// matching a value from ROLE_CATEGORIES. `null` means "show every member" —
// the same behavior the old free-form "extras" list already had.
export const DEFAULT_INSTRUMENT_SLOTS = [
  { id: 'k1',             label: 'Keyboard 1',     icon: 'Piano',             multiSelect: false, core: true,  category: ROLE_CATEGORIES.KEYBOARD },
  { id: 'k2',             label: 'Keyboard 2',     icon: 'Piano',             multiSelect: false, core: true,  category: ROLE_CATEGORIES.KEYBOARD },
  { id: 'bass',           label: 'Bass',           icon: 'Waves',             multiSelect: true,  core: true,  category: ROLE_CATEGORIES.BASS },
  { id: 'leadGuitar',     label: 'Lead Guitar',    icon: 'Guitar',            multiSelect: true,  core: true,  category: ROLE_CATEGORIES.GUITAR },
  { id: 'acousticGuitar', label: 'Acstc Guitar',   icon: 'Guitar',            multiSelect: true,  core: true,  category: ROLE_CATEGORIES.GUITAR },
  { id: 'drums',          label: 'Drums',          icon: 'Drum',              multiSelect: true,  core: true,  category: ROLE_CATEGORIES.DRUMS },
  { id: 'soundEngineer',  label: 'Sound Engineer', icon: 'SlidersHorizontal', multiSelect: false, core: true,  category: ROLE_CATEGORIES.SOUND },

  { id: 'violin',        label: 'Violin',          icon: 'Music2',     multiSelect: true, core: false, category: null },
  { id: 'viola',         label: 'Viola',           icon: 'Music2',     multiSelect: true, core: false, category: null },
  { id: 'cello',         label: 'Cello',           icon: 'Music2',     multiSelect: true, core: false, category: null },
  { id: 'violinSection', label: 'Violin Section',  icon: 'Music2',     multiSelect: true, core: false, category: null },
  { id: 'trumpet',       label: 'Trumpet',         icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'flugelhorn',    label: 'Flugelhorn',      icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'trombone',      label: 'Trombone',        icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'frenchHorn',    label: 'French Horn',     icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'tuba',          label: 'Tuba',            icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'flute',         label: 'Flute',           icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'piccolo',       label: 'Piccolo',         icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'clarinet',      label: 'Clarinet',        icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'altoSax',       label: 'Alto Saxophone',  icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'tenorSax',      label: 'Tenor Saxophone', icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'oboe',          label: 'Oboe',            icon: 'AudioLines', multiSelect: true, core: false, category: null },
  { id: 'cajon',         label: 'Cajon',           icon: 'Drum',       multiSelect: true, core: false, category: null },
  { id: 'djembe',        label: 'Djembe',          icon: 'Drum',       multiSelect: true, core: false, category: null },
  { id: 'tambourine',    label: 'Tambourine',      icon: 'Drum',       multiSelect: true, core: false, category: null },
  { id: 'shaker',        label: 'Shaker',          icon: 'Drum',       multiSelect: true, core: false, category: null },
  { id: 'handBells',     label: 'Hand Bells',      icon: 'Bell',       multiSelect: true, core: false, category: null },
  { id: 'ukulele',       label: 'Ukulele',         icon: 'Guitar',     multiSelect: true, core: false, category: null },
  { id: 'banjo',         label: 'Banjo',           icon: 'Guitar',     multiSelect: true, core: false, category: null },
  { id: 'mandolin',      label: 'Mandolin',        icon: 'Guitar',     multiSelect: true, core: false, category: null },
  { id: 'synthPads',     label: 'Synth / Pads',    icon: 'Piano',      multiSelect: true, core: false, category: null },
  { id: 'loopStation',   label: 'Loop Station',    icon: 'Repeat2',    multiSelect: true, core: false, category: null },
];
```

- [ ] **Step 3: Verify with a manual browser check**

Run: `npm run dev`, then in the app's browser console (any page) run:

```js
import('/src/data/defaultAppConfig.js').then(m => console.log(m.DEFAULT_INSTRUMENT_SLOTS.length, m.DEFAULT_WORSHIP_LEADER_ROLES))
```

Expected: logs `31 (6) ['Opening/Welcome', 'Praise', 'Worship', "Lord's Table", 'Opening', 'Other']` (31 slots: 7 core + 24 optional) with no import errors in the console.

- [ ] **Step 4: Commit**

```bash
git add src/data/instrumentIcons.jsx src/data/defaultAppConfig.js
git commit -m "feat: add default worship-leader roles and instrument slot config data"
```

---

### Task 2: Lineup instrument normalization utility

**Files:**
- Create: `src/utils/normalizeLineupInstruments.js`

**Interfaces:**
- Consumes: nothing from Task 1 directly (works on plain data — an `instrumentSlots` array with `{ id, label, core }` shape and a `lineup` object).
- Produces (consumed by Plans 2, 3, 4): `normalizeLineupInstruments(lineup, instrumentSlots) => { [slotId]: string[] }`.

- [ ] **Step 1: Write the utility**

Create `src/utils/normalizeLineupInstruments.js`:

```js
// Normalizes a lineup's instrument assignments into { [slotId]: memberId[] },
// regardless of whether the lineup was saved before or after the dynamic
// instrument-slots feature existed.
//
// Old lineups store: instruments.k1/k2/bass/leadGuitar/acousticGuitar/drums
// (each a memberId[]), a top-level `soundEngineer` (a single memberId string),
// and instruments.extras (an array of { label, memberIds } — ad hoc instruments
// the admin picked from a fixed catalogue).
//
// New lineups store a single `instrumentAssignments` map keyed by slot id.
//
// This function never mutates or writes anything — it's a pure read-time shim
// so historical Firestore documents never need to be migrated.
export function normalizeLineupInstruments(lineup, instrumentSlots) {
  if (lineup.instrumentAssignments) return lineup.instrumentAssignments;

  const legacyInstruments = lineup.instruments || {};
  const result = {};

  for (const slot of instrumentSlots) {
    if (slot.id === 'soundEngineer') {
      result.soundEngineer = lineup.soundEngineer ? [lineup.soundEngineer] : [];
    } else if (Array.isArray(legacyInstruments[slot.id])) {
      result[slot.id] = legacyInstruments[slot.id];
    }
  }

  // Legacy "extras" were keyed by label, not by a stable id — match them to
  // whichever current slot shares that label. If no slot matches (e.g. the
  // admin has since renamed or removed it), keep the data under a synthetic
  // "legacy-<label>" key so it isn't silently dropped, even though it won't
  // render until re-mapped to a real slot.
  for (const extra of legacyInstruments.extras || []) {
    const matchedSlot = instrumentSlots.find(s => s.label === extra.label);
    const targetId = matchedSlot ? matchedSlot.id : `legacy-${extra.label}`;
    result[targetId] = [...(result[targetId] || []), ...(extra.memberIds || [])];
  }

  return result;
}
```

- [ ] **Step 2: Verify with a throwaway node script**

Run:

```bash
node -e "
import('./src/utils/normalizeLineupInstruments.js').then(({ normalizeLineupInstruments }) => {
  const slots = [
    { id: 'k1', label: 'Keyboard 1', core: true },
    { id: 'bass', label: 'Bass', core: true },
    { id: 'soundEngineer', label: 'Sound Engineer', core: true },
    { id: 'tambourine', label: 'Tambourine', core: false },
  ];

  // Legacy-format lineup (today's real Firestore shape)
  const legacyLineup = {
    instruments: { k1: ['m1'], bass: ['m2'], extras: [{ label: 'Tambourine', memberIds: ['m3'] }] },
    soundEngineer: 'm4',
  };
  console.log('legacy:', JSON.stringify(normalizeLineupInstruments(legacyLineup, slots)));

  // New-format lineup (passthrough)
  const newLineup = { instrumentAssignments: { k1: ['m9'] } };
  console.log('new:', JSON.stringify(normalizeLineupInstruments(newLineup, slots)));

  // Legacy extra whose label no longer matches any slot
  const orphanLineup = { instruments: { extras: [{ label: 'Kazoo', memberIds: ['m5'] }] } };
  console.log('orphan:', JSON.stringify(normalizeLineupInstruments(orphanLineup, slots)));
});
"
```

Expected output (order of keys may vary, values must match):
```
legacy: {"k1":["m1"],"bass":["m2"],"soundEngineer":["m4"],"tambourine":["m3"]}
new: {"k1":["m9"]}
orphan: {"legacy-Kazoo":["m5"]}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/normalizeLineupInstruments.js
git commit -m "feat: add read-time normalizer for legacy lineup instrument data"
```

---

### Task 3: Firestore security rules for `config/appConfig`

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Produces: a publicly-readable, admin-writable `config/appConfig` document path, so both the authenticated app and the unauthenticated public lineup pages (Plan 4) can read `worshipLeaderRoles`/`instrumentSlots`.

- [ ] **Step 1: Add a helper to resolve the signed-in user's own team id**

In `firestore.rules`, add this function right after the existing `canWriteTeam` function (after line 62, before the `// ─── /users/{uid} ─` comment on line 64):

```
    // Resolves the signed-in user's current team id (or null), by reading
    // their /users/{uid} document. Used only for the global config path below,
    // which isn't nested under a specific team.
    function myTeamId() {
      return isSignedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teamId
        : null;
    }

    // Can the signed-in user write the global app config? Any admin
    // (main_admin or co_admin, via canWriteTeam) of their own current team —
    // this is intentionally a single shared config across all teams, not
    // scoped per team.
    function canWriteAppConfig() {
      let teamId = myTeamId();
      return teamId != null && canWriteTeam(teamId);
    }
```

- [ ] **Step 2: Add the `config/appConfig` match block**

In `firestore.rules`, add this new top-level match block right after the closing `}` of the `/teams/{teamId}` match block (after line 102, before the `// ─── Deny everything else ───` comment on line 104):

```
    // ─── /config/appConfig ───────────────────────────────────────────────────
    // Global (not team-scoped) config: worship-leader role labels and
    // instrument slot definitions, editable from Team Setup → Roles & Instruments.
    // Readable by anyone — including unauthenticated visitors of a public
    // shared-lineup link — writable only by an admin of the writer's own team.
    match /config/appConfig {
      allow read: if true;
      allow write: if canWriteAppConfig();
    }
```

- [ ] **Step 3: Verify the rules file is syntactically valid**

Run: `npx firebase-tools@latest deploy --only firestore:rules --dry-run 2>&1 || firebase deploy --only firestore:rules --dry-run`

If neither `firebase` CLI is available/authenticated in this environment, instead visually re-read the full `firestore.rules` file and confirm: every `match` block has a matching closing `}`, and the new `myTeamId`/`canWriteAppConfig` functions are defined before they're used (functions in Firestore rules must be declared before use in the same scope, same as the existing helpers above them).

Expected: no syntax errors reported (or, for the manual check, brace-matching and declaration order both hold).

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat: allow public read / admin write on config/appConfig"
```

**Note for whoever runs this:** this only updates the rules *file* in git. It does not take effect in the live Firebase project until someone runs `firebase deploy --only firestore:rules` with the right credentials — do that deliberately, as a separate, visible step, not automatically as part of landing this commit.

---

### Task 4: AppContext wiring for global app config

**Files:**
- Modify: `src/context/AppContext.jsx`

**Interfaces:**
- Consumes: `DEFAULT_WORSHIP_LEADER_ROLES`, `DEFAULT_INSTRUMENT_SLOTS` from `src/data/defaultAppConfig.js` (Task 1).
- Produces (consumed by Plans 2, 3, 4 via `useApp()`): `worshipLeaderRoles: string[]`, `instrumentSlots: Array<{id,label,icon,multiSelect,core,category}>`, `updateAppConfig(patch: object) => Promise<void>`.

- [ ] **Step 1: Import the defaults**

In `src/context/AppContext.jsx`, add this import after line 7 (`import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';`):

```js
import { DEFAULT_WORSHIP_LEADER_ROLES, DEFAULT_INSTRUMENT_SLOTS } from '../data/defaultAppConfig';
```

- [ ] **Step 2: Add `appConfig` state**

In `src/context/AppContext.jsx`, add this line right after line 24 (`const [myRole, setMyRole] = useState(null); // 'main_admin' | 'co_admin' | 'member' | null`):

```js
  const [appConfig, setAppConfig] = useState(null); // { worshipLeaderRoles, instrumentSlots } — null until config/appConfig loads (or doesn't exist)
```

- [ ] **Step 3: Add the global config listener**

In `src/context/AppContext.jsx`, add this new effect right after the "Load templates" effect closes (after line 222, before the `// ==================== AUTH ====================` comment on line 224):

```js

  // --- Load global app config (worship leader roles & instrument slots) ---
  // Not team-scoped — a single shared document for the whole app. Loaded
  // regardless of auth state (Firestore rules allow public read) so both the
  // authenticated app and unauthenticated public lineup pages can use it.
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'appConfig'), (snap) => {
      setAppConfig(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, []);
```

- [ ] **Step 4: Expose the config with defaults, and an update function**

In `src/context/AppContext.jsx`, add these lines right after line 244 (`const hasTeamA = team?.hasTeamA === true;`):

```js

  // Roles/instrument-slot config with hardcoded fallbacks — so nothing breaks
  // before config/appConfig exists or before an admin customizes a field.
  const worshipLeaderRoles = appConfig?.worshipLeaderRoles || DEFAULT_WORSHIP_LEADER_ROLES;
  const instrumentSlots = appConfig?.instrumentSlots || DEFAULT_INSTRUMENT_SLOTS;
```

Then add this function right after `updateTeamSettings` closes (after line 263, before the `// Load a team's public data without being logged in` comment on line 265):

```js

  // ==================== APP CONFIG (global, not team-scoped) ====================
  const updateAppConfig = async (patch) => {
    await setDoc(doc(db, 'config', 'appConfig'), patch, { merge: true });
  };
```

- [ ] **Step 5: Expose the new values on the context**

In `src/context/AppContext.jsx`, in the `<AppContext.Provider value={{ ... }}>` object, add this line right after `hasTeamA,` (line 630):

```js
        worshipLeaderRoles,
        instrumentSlots,
        updateAppConfig,
```

- [ ] **Step 6: Verify with a manual browser check**

Run: `npm run dev`, sign into the app (or view a public team schedule link), open the browser console, and run:

```js
window.__appDebug = document.querySelector('#root')._reactRootContainer; // may be undefined depending on React version — if so, skip this and just check the Network tab
```

Simpler and reliable: open DevTools → Application/Network tab, confirm a Firestore listen request for `config/appConfig` appears (it will return "not found" the first time — that's expected, nothing has written to it yet). Then temporarily add `console.log('worshipLeaderRoles', worshipLeaderRoles, 'instrumentSlots', instrumentSlots.length)` inside `LineupFormPage.jsx`'s component body (any page using `useApp()` works), reload, confirm the console prints `worshipLeaderRoles ['Opening/Welcome', 'Praise', 'Worship', "Lord's Table", 'Opening', 'Other']` and `instrumentSlots 31`, then remove the temporary `console.log`.

Expected: no console errors, values match the defaults from Task 1 exactly (since `config/appConfig` doesn't exist in Firestore yet).

- [ ] **Step 7: Commit**

```bash
git add src/context/AppContext.jsx
git commit -m "feat: load global roles/instrument-slot config in AppContext"
```
