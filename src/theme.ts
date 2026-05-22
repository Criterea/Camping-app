import { Platform } from 'react-native';

export const Colors = {
  paper: '#F4ECD8',
  paperLight: '#FAF4E3',
  paperEdge: '#E8DCC0',
  ink: '#2A2419',
  inkSoft: '#6B5D45',
  inkFaint: '#9C8F73',
  accent: '#8B6F3F',
  accentDeep: '#5E4824',
  tape: '#E9D7A8',
  shadow: 'rgba(45, 30, 10, 0.22)',
  shadowSoft: 'rgba(45, 30, 10, 0.10)',
  danger: '#A53F2B',
  success: '#4F6B3A',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'Georgia',
    serifBold: 'Georgia-Bold',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    serifBold: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
})!;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 18,
} as const;
