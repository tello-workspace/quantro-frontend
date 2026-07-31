import { describe, it, expect } from 'vitest';
import { toDateKey, startOfWeek, buildMonthGrid, buildWeekGrid } from './calendarService';

describe('toDateKey', () => {
  it('ay ve gunu iki haneye tamamlar', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('cift haneli ay/gunde padding eklemez', () => {
    expect(toDateKey(new Date(2026, 10, 23))).toBe('2026-11-23');
  });
});

describe('startOfWeek', () => {
  it('zaten Pazartesi ise ayni gunu doner', () => {
    const monday = new Date(2026, 6, 27); // 27 Temmuz 2026 = Pazartesi
    expect(toDateKey(startOfWeek(monday))).toBe('2026-07-27');
  });

  it('Pazar gunu icin bir onceki Pazartesi\'yi doner', () => {
    const sunday = new Date(2026, 7, 2); // 2 Agustos 2026 = Pazar
    expect(toDateKey(startOfWeek(sunday))).toBe('2026-07-27');
  });

  it('hafta ay sinirini gecince dogru ayin gununu doner', () => {
    const wednesday = new Date(2026, 7, 5); // 5 Agustos 2026 = Carsamba
    expect(toDateKey(startOfWeek(wednesday))).toBe('2026-08-03');
  });
});

describe('buildMonthGrid', () => {
  it('her zaman 42 gun (6 hafta) doner', () => {
    expect(buildMonthGrid(new Date(2026, 1, 15)).length).toBe(42);
  });

  it('grid Pazartesi ile baslar', () => {
    const grid = buildMonthGrid(new Date(2026, 1, 15));
    expect(grid[0].getDay()).toBe(1);
  });

  it('ayin butun gunlerini icerir (subat 2026 = 28 gun, artik yil degil)', () => {
    const grid = buildMonthGrid(new Date(2026, 1, 1));
    const febDays = grid.filter((d) => d.getMonth() === 1);
    expect(febDays.length).toBe(28);
  });

  it('yil sinirini dogru gecer (Aralik -> Ocak tasmasi)', () => {
    const grid = buildMonthGrid(new Date(2026, 11, 10));
    const lastDay = grid[grid.length - 1];
    expect(lastDay.getFullYear()).toBe(2027);
    expect(lastDay.getMonth()).toBe(0);
  });
});

describe('buildWeekGrid', () => {
  it('7 gun doner', () => {
    expect(buildWeekGrid(new Date(2026, 6, 29)).length).toBe(7);
  });

  it('Pazartesi\'den Pazar\'a sirali gunler doner', () => {
    const grid = buildWeekGrid(new Date(2026, 6, 29)); // Carsamba
    expect(grid.map((d) => d.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(toDateKey(grid[0])).toBe('2026-07-27');
    expect(toDateKey(grid[6])).toBe('2026-08-02');
  });
});
