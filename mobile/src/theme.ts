import { Platform } from 'react-native';

export const lightColors = {
  paper: '#F7F1E1',
  ink: '#111111',
  /** Always-dark text for use on bright button backgrounds */
  buttonText: '#111111',
  mutedInk: '#5A544A',
  faintInk: '#8A8174',
  accent: '#1B6EFF',
  accentAlt: '#E4572E',
  highlight: '#F9D423',
  success: '#1F7A4C',
  danger: '#D7263D',
  card: '#FFFFFF',
  overlay: 'rgba(17, 17, 17, 0.55)',
  successBg: '#DFF5E6',
  dangerBg: '#FFE0E0',
  warningBg: '#FFF4C7',
  subtleBg: '#EFE7D7',
};

export const darkColors: Colors = {
  paper: '#1A1A1A',
  ink: '#E8E8E8',
  /** Always-dark text for use on bright button backgrounds */
  buttonText: '#111111',
  mutedInk: '#A0A0A0',
  faintInk: '#707070',
  accent: '#4D8FFF',
  accentAlt: '#F07050',
  highlight: '#F9D423',
  success: '#2EAA6A',
  danger: '#EF5350',
  card: '#2A2A2A',
  overlay: 'rgba(0, 0, 0, 0.7)',
  successBg: '#1A3A2A',
  dangerBg: '#3A1A1A',
  warningBg: '#3A3418',
  subtleBg: '#2E2A24',
};

export type Colors = typeof lightColors;

export const fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  sans: Platform.select({
    ios: 'Helvetica Neue',
    android: 'sans-serif',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

export const lightShadows = {
  hard: {
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 2,
  },
};

export const darkShadows: Shadows = {
  hard: {
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 2,
  },
};

export type Shadows = typeof lightShadows;

// Backward-compatible aliases
export const colors = lightColors;
export const shadows = lightShadows;
