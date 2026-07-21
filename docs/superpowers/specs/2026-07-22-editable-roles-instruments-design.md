# Editable Worship Leader Roles & Instrument Slots

## Problem

Worship-leader role labels (Opening, Welcome, Praise, Worship, Lord's Table, Other) and instrument slots (Keyboard 1, Keyboard 2, Bass, Lead Guitar, Acoustic Guitar, Drums, Sound Engineer) are hardcoded in multiple places:

- `src/pages/LineupFormPage.jsx` — `TEAM_A_ROLES`, hand-coded JSX per instrument slot, `EXTRA_INSTRUMENTS` picklist, `stdSlots`.
- `src/pages/LineupDetailPage.jsx` — its own separate hardcoded instrument-slot array.
- `src/utils/generateLineupImage.js` — its own hardcoded slot keys for the shareable image.
- `src/data/initialData.js` — `INSTRUMENT_ROLES` (imported but effectively dead — not used to render the form).

Adding, renaming, or removing a role/instrument today requires editing JSX in three separate files. There is no in-app way to manage these lists.

## Goal

Let an admin add/edit/remove/reorder both lists from the app UI:
1. **Worship Leader Roles** — the role labels used when assigning worship leaders on Team A Sundays.
2. **Instrument Slots** — the instrument/position slots available on a lineup (Keyboard, Bass, Guitar, Drums, Sound Engineer, and any custom ones added later).

## Scope decisions (confirmed with user)

- **Single global config**, not per-team — one shared list for the whole app.
- **Instrument slots get full CRUD**: add, edit label/icon, remove, reorder — not just renaming the existing fixed set.
- Member skill tags (`ROLE_CATEGORIES` in `initialData.js`, used for filtering eligible members in dropdowns) are a separate concept and **out of scope**.
- The "Additional Instruments" 25-item picklist (`EXTRA_INSTRUMENTS`) is folded into the same managed list — every instrument slot gets a `core` flag; `core` slots always render as their own row on the lineup form, non-core ones are chosen through an "Add Instrument" picker (same UX pattern as today's extras, just sourced from the managed list).

## Data model

### New Firestore document: `config/appConfig`

```js
{
  worshipLeaderRoles: string[],      // ordered, e.g. ["Opening/Welcome", "Praise", "Worship", "Lord's Table", "Opening", "Other"]
  instrumentSlots: [
    {
      id: string,           // stable slug, e.g. "leadGuitar" — generated on create, never shown/edited by the user
      label: string,        // display text, e.g. "Lead Guitar"
      icon: string,         // lucide-react icon name, chosen from a fixed picker (not free text)
      multiSelect: boolean, // whether more than one member can fill this slot
      core: boolean,        // true = always shown as its own row; false = available via "Add Instrument" picker
    },
    ...
  ]
}
```

This doc is seeded once (migration script, run manually — not part of app boot) with the current hardcoded values, so behavior is unchanged on day one.

### Lineup documents — new dynamic instrument storage

Today a lineup document has fixed top-level fields: `instruments: { k1, k2, bass, leadGuitar, acousticGuitar, drums, extras: [...] }` and a separate `soundEngineer` field.

Going forward, lineups store instrument assignments as **one dynamic map keyed by slot id**:

```js
lineup.instrumentAssignments = {
  k1: ["memberId1"],
  soundEngineer: ["memberId2"],
  tambourine: ["memberId3", "memberId4"],   // example custom/non-core slot
  // ...
}
```

Every slot's value is always an array of member IDs (even single-select slots hold at most one — the UI enforces the max, storage stays uniform).

`lineup.worshipLeaders: [{ memberId, role }]` is unchanged structurally — `role` is already a free string, so no migration is needed there. The Team A role dropdown just sources its options from `worshipLeaderRoles` in config instead of the hardcoded `TEAM_A_ROLES`.

### Backward compatibility (no bulk data migration)

Existing lineup documents keep their old shape (`instruments.k1`, `instruments.extras`, top-level `soundEngineer`, etc.) — we do **not** rewrite historical documents. Instead, a single shared helper normalizes on read:

```js
// src/utils/normalizeLineupInstruments.js
function normalizeLineupInstruments(lineup, instrumentSlots) {
  if (lineup.instrumentAssignments) return lineup.instrumentAssignments; // already new format
  // map legacy fields (k1/k2/bass/leadGuitar/acousticGuitar/drums/soundEngineer/extras)
  // into the { [slotId]: memberIds[] } shape, matching extras by label -> slot label
}
```

Every save from the app writes the new `instrumentAssignments` format going forward; nothing deletes or rewrites old fields. This avoids touching production data as part of this change — a real risk given this is a live scheduling app with real lineup history.

## UI changes

### `TeamSetupPage.jsx` — new "Roles & Instruments" section

Follows the existing Templates CRUD pattern already in this page (list + add/edit modal + delete confirm):

- **Worship Leader Roles** — simple ordered string list. Add, inline-rename, delete, reorder (up/down buttons, consistent with rest of the app's mobile-friendly UI — no drag library currently in use).
- **Instrument Slots** — list showing icon + label + core/optional badge. Add/edit opens a small form: label (text), icon (picker from a fixed set of ~15 relevant lucide-react icons: Piano, Guitar, Drum, Mic, Headphones, Music, etc.), multi-select toggle, core toggle. Delete requires confirmation (and is blocked — or at least warned — if the slot is referenced by any existing lineup, to avoid silently orphaning data).
- Gated behind the same admin check already used for the rest of `TeamSetupPage.jsx`.

### `LineupFormPage.jsx`

- Replace the hand-coded JSX block (K1/K2/Bass/Lead Guitar/Acoustic Guitar/Drums/Sound Engineer) with a loop over `instrumentSlots.filter(s => s.core)`, rendering `<SingleSelect>` or `<MultiSelect>` per `slot.multiSelect`.
- "Add Instrument" picker sources from `instrumentSlots.filter(s => !s.core)` instead of the hardcoded `EXTRA_INSTRUMENTS`.
- Team A worship-leader role `<select>` sources options from `worshipLeaderRoles` instead of `TEAM_A_ROLES`.
- Form state (`form.instrumentAssignments`) replaces `form.instruments`/`form.soundEngineer`; on load, existing lineups run through `normalizeLineupInstruments` first.

### `LineupDetailPage.jsx` and `generateLineupImage.js`

Both replace their private hardcoded slot arrays with a loop over `instrumentSlots` (in stored order), reading assignments via `normalizeLineupInstruments(lineup, instrumentSlots)`.

### Loading the config

A new `appConfig` piece of state in `AppContext.jsx`, loaded via `onSnapshot(doc(db, 'config', 'appConfig'))` alongside the existing team/members/lineups listeners — mirrors the existing pattern exactly.

## Error handling / edge cases

- **Deleting a slot/role still referenced by existing lineups**: don't block deletion outright (admin may legitimately be cleaning up), but show a warning with a count of affected lineups if easily computable client-side; otherwise a generic "existing lineups referencing this will keep their old data but it won't show slot details for it" notice. Deleted slots simply stop appearing in the config-driven UI; `normalizeLineupInstruments` and the detail/image renderers skip slot ids no longer present in config.
- **Empty config on first load** (before the one-time seed runs): fall back to today's hardcoded defaults in code, so nothing breaks if `config/appConfig` doesn't exist yet.
- **Icon picker**: constrained to a fixed allowed list, not free text — prevents typos from silently breaking rendering.

## Out of scope

- Per-team configuration (explicitly declined by user).
- Migrating/rewriting historical lineup documents.
- Editing `ROLE_CATEGORIES` (member skill tags) or `SONG_SECTIONS` (setlist section tags) — separate concepts not mentioned in the original request.
