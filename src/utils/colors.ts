import { Teacher } from '../types/schedule';

export interface TeacherColorPreset {
  name: string;
  hex: string;
}

export const TEACHER_COLOR_PALETTE: TeacherColorPreset[] = [
  { name: 'Biru Cobalt', hex: '#1D4ED8' },
  { name: 'Hijau Teal', hex: '#0F766E' },
  { name: 'Amber', hex: '#B45309' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Merah Mawar', hex: '#BE123C' },
  { name: 'Hijau Zamrud', hex: '#15803D' },
  { name: 'Biru Langit', hex: '#0369A1' },
  { name: 'Oranye Bata', hex: '#C2410C' },
  { name: 'Indigo', hex: '#4338CA' },
  { name: 'Magenta', hex: '#A21CAF' },
  { name: 'Hijau Zaitun', hex: '#4D7C0F' },
  { name: 'Cyan Tua', hex: '#0E7490' },
  { name: 'Ungu', hex: '#9333EA' },
  { name: 'Merah Crimson', hex: '#B91C1C' },
  { name: 'Hijau Daun', hex: '#047857' },
  { name: 'Plum', hex: '#6D28D9' },
  { name: 'Kuning Emas', hex: '#D97706' },
  { name: 'Slate Gelap', hex: '#334155' },
];

export function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [29, 78, 216];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgbTuple(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Mixes a hex color with white (amount 0..1 of original color) for crisp light fills in PDF/print.
 */
export function hexToLightTintRgb(hex: string, strength = 0.14): [number, number, number] {
  const [r, g, b] = hexToRgbTuple(hex);
  return [
    Math.round(255 - (255 - r) * strength),
    Math.round(255 - (255 - g) * strength),
    Math.round(255 - (255 - b) * strength),
  ];
}

export function getTeacherColorHex(teacher: Teacher | null | undefined, indexFallback = 0): string {
  if (teacher?.color && /^#[0-9A-Fa-f]{6}$/.test(teacher.color)) {
    return teacher.color;
  }
  if (teacher?.id) {
    let hash = 0;
    for (let i = 0; i < teacher.id.length; i++) {
      hash = (hash * 31 + teacher.id.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % TEACHER_COLOR_PALETTE.length;
    return TEACHER_COLOR_PALETTE[idx].hex;
  }
  return TEACHER_COLOR_PALETTE[indexFallback % TEACHER_COLOR_PALETTE.length].hex;
}
