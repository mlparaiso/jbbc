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
