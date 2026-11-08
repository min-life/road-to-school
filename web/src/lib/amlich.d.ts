declare module 'amlich.js' {
  export function computeDateToLunarDate(day: number, month: number, year: number, timezone: number): { lunarDay: number; lunarMonth: number; lunarYear: number; lunarLeap: boolean };
  export function computeDateFromLunarDate(day: number, month: number, year: number, leap: number, timezone: number): { day: number; month: number; year: number } | number[];
}
