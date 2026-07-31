// src/features/board/services/calendarService.ts
// CalendarView.tsx'in tarih/grid hesaplarini pure fonksiyon olarak disari
// alir - board endpoint'inin dueDate'i "YYYY-MM-DD" (saat/timezone'suz)
// dondurdugu varsayimiyla calisir.

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Haftayi Pazartesi'den baslatir (JS getDay(): 0=Pazar..6=Cmt).
export function startOfWeek(d: Date): Date {
  const weekday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekday);
}

// Ay gorunumu icin sabit 6x7=42 gunluk grid (onceki/sonraki ayin tasan
// gunleri dahil) - cursor hangi gunu tasirsa tasisin, o ayin ait oldugu grid.
export function buildMonthGrid(cursor: Date): Date[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from(
    { length: 42 },
    (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
  );
}

// Hafta gorunumu icin cursor'un icinde bulundugu haftanin 7 gunu (Pzt-Paz).
export function buildWeekGrid(cursor: Date): Date[] {
  const gridStart = startOfWeek(cursor);
  return Array.from(
    { length: 7 },
    (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
  );
}
