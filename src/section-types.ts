import type { SectionType } from '@/lib/db';

export type SectionPreset = {
  type: SectionType;
  label: string;
  description: string;
  symbol: string;
  emoji: string;
  tint: string;
};

export const SECTION_PRESETS: SectionPreset[] = [
  {
    type: 'day',
    label: 'Day Log',
    description: 'What we did today',
    symbol: 'sun.max.fill',
    emoji: '☀️',
    tint: '#D4A24A',
  },
  {
    type: 'meals',
    label: 'Meals',
    description: 'What we cooked & ate',
    symbol: 'fork.knife',
    emoji: '🍳',
    tint: '#B96A3D',
  },
  {
    type: 'camp',
    label: 'Camp',
    description: 'Tent, fire, the setup',
    symbol: 'tent.fill',
    emoji: '⛺',
    tint: '#6B7F4F',
  },
  {
    type: 'wildlife',
    label: 'Wildlife',
    description: 'Animals & plants we saw',
    symbol: 'pawprint.fill',
    emoji: '🦌',
    tint: '#4F6B5C',
  },
  {
    type: 'custom',
    label: 'Custom',
    description: 'Anything else worth a chapter',
    symbol: 'sparkles',
    emoji: '✨',
    tint: '#8B6F3F',
  },
];

export function getPreset(type: SectionType): SectionPreset {
  return SECTION_PRESETS.find((p) => p.type === type) ?? SECTION_PRESETS[SECTION_PRESETS.length - 1];
}
