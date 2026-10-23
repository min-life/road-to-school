/**
 * VietMap Map Styles Configuration
 * Managed strictly in code (no Style URLs in environment variables).
 */

export const VIETMAP_STYLES = {
  streets: {
    id: 'streets',
    label: 'Đường phố',
    url: 'https://maps.vietmap.vn/maps/styles/tm/style.json',
  },
  light: {
    id: 'light',
    label: 'Sáng',
    url: 'https://maps.vietmap.vn/maps/styles/lm/style.json',
  },
  dark: {
    id: 'dark',
    label: 'Tối',
    url: 'https://maps.vietmap.vn/maps/styles/dm/style.json',
  },
} as const;

export type VietMapStyleKey = keyof typeof VIETMAP_STYLES;
export const DEFAULT_VIETMAP_STYLE: VietMapStyleKey = 'streets';
