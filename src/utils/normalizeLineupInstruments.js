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
      if (lineup.soundEngineer) {
        result.soundEngineer = [lineup.soundEngineer];
      }
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
