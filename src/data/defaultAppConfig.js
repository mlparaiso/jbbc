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
