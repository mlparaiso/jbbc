# Editable Roles & Instruments — Plan 4: Display Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the read-only lineup views — the signed-in detail page, the public (unauthenticated) share-link page, and the not-yet-wired-up shareable-image generator — render instrument slots from the global config instead of each maintaining its own hardcoded copy of the slot list.

**Architecture:** Both `LineupDetailPage.jsx` and `PublicLineupDetailPage.jsx` currently define their own near-identical `INSTRUMENT_CONFIG` array and `EXTRA_ICON_MAP`. Both are replaced with `useApp().instrumentSlots` + `normalizeLineupInstruments(lineup, instrumentSlots)` (Plan 1) + the shared `SlotIcon` component (Plan 1). `generateLineupImage.js` (currently unused dead code — grep confirms no caller exists yet, only referenced in `ROADMAP.md` as a future integration) is updated the same way for consistency, so it doesn't silently reference a stale data shape whenever it does get wired up.

**Tech Stack:** React (Vite), Tailwind CSS, lucide-react icons, Canvas 2D API (`generateLineupImage.js` only). Plain JavaScript, no TypeScript.

## Global Constraints

- **Requires Plan 1 (foundation) to be merged first.** This plan consumes `instrumentSlots` from `useApp()`, `normalizeLineupInstruments` from `src/utils/normalizeLineupInstruments.js`, and `SlotIcon` from `src/data/instrumentIcons.jsx` — all added by Plan 1.
- No test framework exists in this repo. Verification for Tasks 1–2 is manual (`npm run dev` + browser). Task 3 (`generateLineupImage.js`) currently has no caller anywhere in the app, so its verification is a careful read-through diff check, not a live run — say so plainly rather than claiming an untested code path was "verified".
- Plain JavaScript only — no TypeScript syntax.
- Preserve the existing visual layout exactly: core instrument slots in a 3-column grid, Sound Engineer + Set List as a separate 2-column row below it, non-core ("extra") slots only rendered when they have at least one assigned member.
- Do not change anything about the Songs section, section pairing (Opening/Welcome side-by-side), Notes, or Next WL rendering in either detail page — out of scope.

---

### Task 1: `LineupDetailPage.jsx` — config-driven instrument grid

**Files:**
- Modify: `src/pages/LineupDetailPage.jsx`

**Interfaces:**
- Consumes: `useApp()` → `instrumentSlots` (Plan 1); `normalizeLineupInstruments` from `../utils/normalizeLineupInstruments` (Plan 1); `SlotIcon` from `../data/instrumentIcons` (Plan 1).

- [ ] **Step 1: Update imports and remove the hardcoded instrument config**

In `src/pages/LineupDetailPage.jsx`, replace lines 1–61 (from the top `import` statements through the end of the `groupSongs` function) with:

```jsx
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Mic2, Music4, BookOpen, CalendarCheck,
  Printer, Pencil, Trash2, ChevronLeft, ChevronRight, AlertCircle,
  SlidersHorizontal, Youtube, Share2, Check, ExternalLink
} from 'lucide-react';
import { normalizeLineupInstruments } from '../utils/normalizeLineupInstruments';
import { SlotIcon } from '../data/instrumentIcons';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getPracticeTimingLabel(practiceTiming) {
  switch (practiceTiming) {
    case 'before':
      return 'before the Service';
    case 'none':
      return null;
    case 'after':
    default:
      return 'after the Service';
  }
}

const SECTION_ORDER = [
  'Opening',
  'Opening/Welcome',
  'Welcome',
  'Praise and Worship',
  "Lord's Table",
  'Special Number',
  'Other',
];

// Group songs by section, sorted by predefined section order
function groupSongs(songs) {
  const map = {};
  for (const song of songs) {
    const sec = song.section || 'Other';
    if (!map[sec]) map[sec] = [];
    map[sec].push(song);
  }
  // Sort sections by SECTION_ORDER, then unknowns at the end
  const sortedSections = Object.keys(map).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a);
    const bi = SECTION_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return sortedSections.map(sec => ({ section: sec, songs: map[sec] }));
}
```

(This removes the `EXTRA_ICON_MAP` object and the hardcoded `INSTRUMENT_CONFIG` array, and drops the now-unused `Piano, Guitar, Waves, Drum, Music2, AudioLines, Bell, Repeat2` icon imports in favor of the shared `SlotIcon`.)

- [ ] **Step 2: Pull `instrumentSlots` from context and compute normalized assignments**

In `src/pages/LineupDetailPage.jsx`, find this line (originally line 83):

```jsx
  const { getLineupById, getMemberById, canManageLineups, deleteLineup, lineups, teamId } = useApp();
```

Replace it with:

```jsx
  const { getLineupById, getMemberById, canManageLineups, deleteLineup, lineups, teamId, instrumentSlots } = useApp();
```

Then find this line (originally line 111):

```jsx
  const se = getMemberById(lineup.soundEngineer);
```

Replace it with:

```jsx
  const assignments = normalizeLineupInstruments(lineup, instrumentSlots);
  const seNames = (assignments.soundEngineer || []).map(mid => getMemberById(mid)?.name).filter(Boolean).join(' / ');
```

(This must come after the `if (!lineup) { return ...; }` early return, same as the original `se` line did, since `lineup` isn't guaranteed to exist before that point.)

- [ ] **Step 3: Replace the instruments grid JSX**

In `src/pages/LineupDetailPage.jsx`, find this block (originally lines 262–333, the `{/* Instruments grid */}` section through its closing `</div>`):

```jsx
        {/* Instruments grid */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Instruments</p>
          {/* 3-col grid: K1, K2, LG, AG, Bass, Drums */}
          <div className="grid grid-cols-3 gap-2">
            {INSTRUMENT_CONFIG.map(({ key, icon, label, iconClass }) => {
              const names = ((lineup.instruments || {})[key] || [])
                .map(id => getMemberById(id)?.name)
                .filter(Boolean)
                .join(' / ');
              return (
                <div key={key} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-2">
                  <span className={`${iconClass} flex-shrink-0`}>{icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 leading-none">{label}</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{names || '—'}</p>
                  </div>
                </div>
              );
            })}
            {/* Extra instruments */}
            {((lineup.instruments || {}).extras || []).map((extra, ei) => {
              const names = (extra.memberIds || [])
                .map(id => getMemberById(id)?.name)
                .filter(Boolean)
                .join(' / ');
              const icon = EXTRA_ICON_MAP[extra.icon] || EXTRA_ICON_MAP['Music2'];
              return (
                <div key={ei} className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-2 py-2">
                  <span className="text-purple-400 flex-shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 leading-none">{extra.label}</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{names || '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2-col row: Sound Engineer + Set List (50/50) */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-2">
              <span className="text-blue-400 flex-shrink-0"><SlidersHorizontal size={14} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 leading-none">Sound Engineer</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{se?.name || '—'}</p>
              </div>
            </div>
            {lineup.setListUrl ? (
              <a
                href={lineup.setListUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-2 py-2 hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
              >
                <span className="text-green-500 flex-shrink-0"><ExternalLink size={14} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 leading-none">Set List</p>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 truncate">Open ↗</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-2 opacity-40">
                <span className="text-gray-400 flex-shrink-0"><ExternalLink size={14} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 leading-none">Set List</p>
                  <p className="text-sm font-medium text-gray-400 truncate">—</p>
                </div>
              </div>
            )}
          </div>
        </div>
```

Replace it with:

```jsx
        {/* Instruments grid */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Instruments</p>
          {/* 3-col grid: every core slot (except Sound Engineer, shown below) + any active extras */}
          <div className="grid grid-cols-3 gap-2">
            {instrumentSlots
              .filter(slot => slot.id !== 'soundEngineer' && (slot.core || (assignments[slot.id]?.length > 0)))
              .map(slot => {
                const names = (assignments[slot.id] || [])
                  .map(mid => getMemberById(mid)?.name)
                  .filter(Boolean)
                  .join(' / ');
                return (
                  <div
                    key={slot.id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 ${slot.core ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-purple-50 dark:bg-purple-900/20'}`}
                  >
                    <span className={`${slot.core ? 'text-primary-500' : 'text-purple-400'} flex-shrink-0`}>
                      <SlotIcon name={slot.icon} size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 leading-none">{slot.label}</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{names || '—'}</p>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* 2-col row: Sound Engineer + Set List (50/50) */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-2">
              <span className="text-blue-400 flex-shrink-0"><SlidersHorizontal size={14} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 leading-none">Sound Engineer</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{seNames || '—'}</p>
              </div>
            </div>
            {lineup.setListUrl ? (
              <a
                href={lineup.setListUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-2 py-2 hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
              >
                <span className="text-green-500 flex-shrink-0"><ExternalLink size={14} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 leading-none">Set List</p>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 truncate">Open ↗</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-2 opacity-40">
                <span className="text-gray-400 flex-shrink-0"><ExternalLink size={14} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 leading-none">Set List</p>
                  <p className="text-sm font-medium text-gray-400 truncate">—</p>
                </div>
              </div>
            )}
          </div>
        </div>
```

- [ ] **Step 4: Lint check**

Run: `npm run lint` — expected: no new errors, no unused-import warnings.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, sign in, open a seeded lineup's detail page (e.g. `/lineup/lineup-2026-01-04`). Confirm:
1. All 6 core instrument slots (Keyboard 1, Keyboard 2, Bass Guitar, Lead Guitar, Acstc Guitar, Drums) plus Sound Engineer show the correct previously-seeded member names — this confirms `normalizeLineupInstruments` correctly reads the legacy data shape.
2. The Set List box shows correctly (empty state or link, depending on the lineup).
3. If you go to Team Setup → Roles & Instruments (from Plan 2) and add a new non-core instrument slot, then edit this lineup (Plan 3) to assign someone to it, the detail page now shows a 7th purple-tinted box for that instrument with the assigned member's name.
4. Deleting that same slot from Team Setup makes the box disappear from the detail page (matches the "deleted slots simply stop appearing" behavior called out in the design doc) without any console error.

- [ ] **Step 6: Commit**

```bash
git add src/pages/LineupDetailPage.jsx
git commit -m "feat: render lineup detail instruments grid from config"
```

---

### Task 2: `PublicLineupDetailPage.jsx` — same treatment for the public share-link page

**Files:**
- Modify: `src/pages/PublicLineupDetailPage.jsx`

**Interfaces:**
- Consumes: `useApp()` → `instrumentSlots` (Plan 1, publicly readable per Plan 1's Firestore rule so this page — reachable without auth — can use it); `normalizeLineupInstruments`, `SlotIcon` (Plan 1).

- [ ] **Step 1: Update imports and remove the hardcoded instrument config**

In `src/pages/PublicLineupDetailPage.jsx`, replace lines 1–45 (from the top imports through the `INSTRUMENT_CONFIG` array) with:

```jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, LogIn, Lock, Mic2, Music4, BookOpen, CalendarCheck, SlidersHorizontal, Youtube, AlertCircle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import DonateSection from '../components/DonateSection';
import { normalizeLineupInstruments } from '../utils/normalizeLineupInstruments';
import { SlotIcon } from '../data/instrumentIcons';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getPracticeTimingLabel(practiceTiming) {
  switch (practiceTiming) {
    case 'before':
      return 'before the Service';
    case 'none':
      return null;
    case 'after':
    default:
      return 'after the Service';
  }
}

const SECTION_ORDER = ['Opening','Opening/Welcome','Welcome','Praise and Worship',"Lord's Table",'Special Number','Other'];

function groupSongs(songs) {
  const map = {};
  for (const song of songs) {
    const sec = song.section || 'Other';
    if (!map[sec]) map[sec] = [];
    map[sec].push(song);
  }
  const sorted = Object.keys(map).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a); const bi = SECTION_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return sorted.map(sec => ({ section: sec, songs: map[sec] }));
}
```

(This removes the `EXTRA_ICON_MAP` object and hardcoded `INSTRUMENT_CONFIG` array, and drops the now-unused `Piano, Guitar, Waves, Drum, Music2, AudioLines, Bell, Repeat2` icon imports.)

- [ ] **Step 2: Pull `instrumentSlots` from context and compute normalized assignments**

In `src/pages/PublicLineupDetailPage.jsx`, find this line (originally line 66):

```jsx
  const { loadPublicTeam, publicTeam, publicLineups, publicMembers, publicLoading, publicError } = useApp();
```

Replace it with:

```jsx
  const { loadPublicTeam, publicTeam, publicLineups, publicMembers, publicLoading, publicError, instrumentSlots } = useApp();
```

Then find this line (originally line 120):

```jsx
  const se = getMember(lineup.soundEngineer);
```

Replace it with:

```jsx
  const assignments = normalizeLineupInstruments(lineup, instrumentSlots);
  const seNames = (assignments.soundEngineer || []).map(mid => getMemberName(mid)).filter(Boolean).join(' / ');
```

(Keep this after the `if (!lineup) return null;` guard, same position as the original `se` line.)

- [ ] **Step 3: Replace the instruments grid JSX**

In `src/pages/PublicLineupDetailPage.jsx`, find this block (originally lines 213–277, the `{/* Instruments */}` section through its closing `</div>`):

```jsx
          {/* Instruments */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Instruments</p>
            {/* 3-col grid: K1, K2, LG, AG, Bass, Drums + extras */}
            <div className="grid grid-cols-3 gap-2">
              {INSTRUMENT_CONFIG.map(({ key, icon, label, iconClass }) => {
                const names = ((lineup.instruments || {})[key] || []).map(id => getMemberName(id)).filter(Boolean).join(' / ') || '—';
                return (
                  <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-2">
                    <span className={`${iconClass} flex-shrink-0`}>{icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 leading-none">{label}</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{names}</p>
                    </div>
                  </div>
                );
              })}
              {/* Extra instruments */}
              {((lineup.instruments || {}).extras || []).map((extra, ei) => {
                const names = (extra.memberIds || []).map(id => getMemberName(id)).filter(Boolean).join(' / ') || '—';
                const icon = EXTRA_ICON_MAP[extra.icon] || EXTRA_ICON_MAP['Music2'];
                return (
                  <div key={ei} className="flex items-center gap-2 bg-purple-50 rounded-lg px-2 py-2">
                    <span className="text-purple-400 flex-shrink-0">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 leading-none">{extra.label}</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{names}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2-col row: Sound Engineer + Set List (50/50) */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-2 py-2">
                <span className="text-blue-400 flex-shrink-0"><SlidersHorizontal size={14} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 leading-none">Sound Engineer</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{se?.name || '—'}</p>
                </div>
              </div>
              {lineup.setListUrl ? (
                <a
                  href={lineup.setListUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-50 rounded-lg px-2 py-2 hover:bg-green-100 transition-colors"
                >
                  <span className="text-green-500 flex-shrink-0"><ExternalLink size={14} /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 leading-none">Set List</p>
                    <p className="text-sm font-medium text-green-700 truncate">Open ↗</p>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-2 opacity-40">
                  <span className="text-gray-400 flex-shrink-0"><ExternalLink size={14} /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 leading-none">Set List</p>
                    <p className="text-sm font-medium text-gray-400 truncate">—</p>
                  </div>
                </div>
              )}
            </div>
          </div>
```

Replace it with:

```jsx
          {/* Instruments */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Instruments</p>
            {/* 3-col grid: every core slot (except Sound Engineer, shown below) + any active extras */}
            <div className="grid grid-cols-3 gap-2">
              {instrumentSlots
                .filter(slot => slot.id !== 'soundEngineer' && (slot.core || (assignments[slot.id]?.length > 0)))
                .map(slot => {
                  const names = (assignments[slot.id] || []).map(mid => getMemberName(mid)).filter(Boolean).join(' / ') || '—';
                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center gap-2 rounded-lg px-2 py-2 ${slot.core ? 'bg-gray-50' : 'bg-purple-50'}`}
                    >
                      <span className={`${slot.core ? 'text-primary-500' : 'text-purple-400'} flex-shrink-0`}>
                        <SlotIcon name={slot.icon} size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-400 leading-none">{slot.label}</p>
                        <p className="text-sm font-medium text-gray-800 truncate">{names}</p>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* 2-col row: Sound Engineer + Set List (50/50) */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-2 py-2">
                <span className="text-blue-400 flex-shrink-0"><SlidersHorizontal size={14} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 leading-none">Sound Engineer</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{seNames || '—'}</p>
                </div>
              </div>
              {lineup.setListUrl ? (
                <a
                  href={lineup.setListUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-50 rounded-lg px-2 py-2 hover:bg-green-100 transition-colors"
                >
                  <span className="text-green-500 flex-shrink-0"><ExternalLink size={14} /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 leading-none">Set List</p>
                    <p className="text-sm font-medium text-green-700 truncate">Open ↗</p>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-2 opacity-40">
                  <span className="text-gray-400 flex-shrink-0"><ExternalLink size={14} /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 leading-none">Set List</p>
                    <p className="text-sm font-medium text-gray-400 truncate">—</p>
                  </div>
                </div>
              )}
            </div>
          </div>
```

- [ ] **Step 4: Lint check**

Run: `npm run lint` — expected: no new errors, no unused-import warnings.

- [ ] **Step 5: Manual verification**

In an incognito/private browser window (to ensure no auth session), navigate to a public schedule link for a team with `isPublic: true` (from the app's "Share" button flow, or construct `/team/{teamId}/lineup/{lineupId}` directly using a real `teamId`/`lineupId` from your dev Firestore project). Confirm:
1. The page loads without signing in.
2. The instruments grid renders identically to the signed-in detail page for the same lineup (Task 1).
3. No console errors — this specifically confirms the Plan 1 Firestore rule (`allow read: if true` on `config/appConfig`) actually works for an unauthenticated request, not just for signed-in users.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PublicLineupDetailPage.jsx
git commit -m "feat: render public lineup instruments grid from config"
```

---

### Task 3: `generateLineupImage.js` — keep the (currently unused) image generator consistent

**Files:**
- Modify: `src/utils/generateLineupImage.js`

**Interfaces:**
- Consumes: an `instrumentSlots` array and pre-normalized `assignments` object (caller's responsibility to call `normalizeLineupInstruments` first — this file has no Firestore/context access, matching its existing pure-function style).
- Produces: same `generateLineupImage({...}) => Promise<Blob>` signature, with `instrumentSlots` + `assignments` replacing the old `INSTRUMENT_CONFIG` parameter.

**Context this file is currently dead code:** `grep -r "generateLineupImage" src` (excluding this file itself and the design doc) turns up only a mention in `ROADMAP.md` under a "not yet built" section — there is no caller anywhere in the app today. This task keeps it from silently rotting out of sync with the new data model, but there is no live UI path to manually click through; verification is a careful read-through, not a browser test.

- [ ] **Step 1: Update the function signature and instrument rendering**

In `src/utils/generateLineupImage.js`, find this line (originally line 44):

```js
export async function generateLineupImage({ lineup, getMemberById, songGroups, url, formatDate, shortDate, INSTRUMENT_CONFIG }) {
```

Replace it with:

```js
export async function generateLineupImage({ lineup, getMemberById, songGroups, url, formatDate, shortDate, instrumentSlots, assignments }) {
```

- [ ] **Step 2: Update the height-measurement pass**

In `src/utils/generateLineupImage.js`, find this block inside `measureHeight()` (originally lines 76–82):

```js
    // Instruments label
    y += 20;
    const instrCount = INSTRUMENT_CONFIG.length + 1; // +1 SE
    const cols = 4;
    const rows = Math.ceil(instrCount / cols);
    y += rows * 48 + (rows - 1) * 8;
    y += 16;
```

Replace it with:

```js
    // Instruments label
    y += 20;
    const instrCount = instrumentSlots.filter(s => s.core || (assignments[s.id]?.length > 0)).length;
    const cols = 4;
    const rows = Math.ceil(instrCount / cols);
    y += rows * 48 + (rows - 1) * 8;
    y += 16;
```

- [ ] **Step 3: Update the instrument cell drawing**

In `src/utils/generateLineupImage.js`, find this block (originally lines 260–271):

```js
  const allInstrs = [
    ...INSTRUMENT_CONFIG.map(({ key, label }) => ({
      label,
      name: (lineup.instruments[key] || []).map(iid => getMemberById(iid)?.name).filter(Boolean).join(' / ') || '—',
      bg: '#f9fafb',
    })),
    {
      label: 'Sound Engineer',
      name: getMemberById(lineup.soundEngineer)?.name || '—',
      bg: '#eff6ff',
    },
  ];
```

Replace it with:

```js
  const allInstrs = instrumentSlots
    .filter(slot => slot.core || (assignments[slot.id]?.length > 0))
    .map(slot => ({
      label: slot.label,
      name: (assignments[slot.id] || []).map(iid => getMemberById(iid)?.name).filter(Boolean).join(' / ') || '—',
      bg: slot.id === 'soundEngineer' ? '#eff6ff' : '#f9fafb',
    }));
```

- [ ] **Step 4: Lint check**

Run: `npm run lint` — expected: no new errors.

- [ ] **Step 5: Read-through verification**

Since there is no caller, verify by reading the full diff and confirming:
1. Every remaining reference to `INSTRUMENT_CONFIG` in the file is gone (`grep -n "INSTRUMENT_CONFIG" src/utils/generateLineupImage.js` returns nothing).
2. Every remaining reference to `lineup.instruments` or `lineup.soundEngineer` in the file is gone (`grep -n "lineup\.instruments\|lineup\.soundEngineer" src/utils/generateLineupImage.js` returns nothing) — the function now only reads from the `assignments` parameter.
3. `instrCount` in `measureHeight()` and `allInstrs.length` used later are computed from the same filter predicate (`slot.core || (assignments[slot.id]?.length > 0)`), so the measured height and the actually-drawn row count can't drift apart.

- [ ] **Step 6: Commit**

```bash
git add src/utils/generateLineupImage.js
git commit -m "chore: keep unused generateLineupImage helper consistent with config-driven instrument slots"
```

---

## Post-plan note: whoever wires up `generateLineupImage` in the future

When a caller is finally added (per `ROADMAP.md` section 4.6), it must pass `instrumentSlots` (from `useApp()`) and pre-compute `assignments` via `normalizeLineupInstruments(lineup, instrumentSlots)` before calling `generateLineupImage(...)` — this file intentionally has no Firestore/context access itself.
