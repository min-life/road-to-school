declare module 'amlich.js' {
  const lunar: {
    computeDateToLunarDate(day: number, month: number, year: number, timezone: number): {
      lunarDay: number;
      lunarMonth: number;
      lunarYear: number;
      lunarLeap: boolean | number;
    };
    computeDateFromLunarDate(
      day: number,
      month: number,
      year: number,
      leap: number,
      timezone: number,
    ): { day: number; month: number; year: number } | number[];
  };

  export default lunar;
}
