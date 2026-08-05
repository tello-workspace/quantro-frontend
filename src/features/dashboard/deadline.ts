// Teslim tarihinin NE ANLAMA GELDIGINI hesaplar.
//
// Liste eskiden yalnizca "08.08.2026" gosteriyordu; bu bir tarih, bir aciliyet
// degil. Kullanicinin cevabini aradigi soru "hangi gun" degil, "ne kadar
// vaktim var" - bu yuzden kalan sure metnini ve aciliyet seviyesini burada
// uretiyoruz.

export type AciliyetSeviyesi = "gecikmis" | "bugun" | "yakin" | "normal" | "yok";

export interface TeslimDurumu {
  seviye: AciliyetSeviyesi;
  /** "3 gün kaldı", "Bugün son gün", "2 gün gecikti" gibi. */
  metin: string;
  /** Tam tarih - metnin yaninda ipucu olarak gosteriliyor. */
  tarih: string | null;
  gunFarki: number | null;
}

/**
 * Gun farkini TAKVIM GUNU uzerinden hesaplar, 24 saatlik dilimlerle degil.
 * Saat 23:00'te yarin sabah 09:00'a kalan sure 10 saat, ama kullanici icin
 * bu "yarin" - 24 saatlik hesap bunu "bugun" diye gosterirdi.
 */
function gunFarkiHesapla(bitis: Date, simdi: Date): number {
  const a = Date.UTC(bitis.getFullYear(), bitis.getMonth(), bitis.getDate());
  const b = Date.UTC(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function teslimDurumu(
  dueDate: string | null,
  lang: "tr" | "en",
  simdi: Date = new Date(),
): TeslimDurumu {
  if (!dueDate) {
    return {
      seviye: "yok",
      metin: lang === "en" ? "No due date" : "Tarih yok",
      tarih: null,
      gunFarki: null,
    };
  }

  const bitis = new Date(dueDate);
  if (Number.isNaN(bitis.getTime())) {
    return { seviye: "yok", metin: lang === "en" ? "No due date" : "Tarih yok", tarih: null, gunFarki: null };
  }

  const fark = gunFarkiHesapla(bitis, simdi);
  const yerel = lang === "en" ? "en-GB" : "tr-TR";
  const tarih = bitis.toLocaleDateString(yerel, { day: "2-digit", month: "short", year: "numeric" });

  if (fark < 0) {
    const gun = Math.abs(fark);
    return {
      seviye: "gecikmis",
      metin:
        lang === "en"
          ? `${gun} day${gun === 1 ? "" : "s"} overdue`
          : `${gun} gün gecikti`,
      tarih,
      gunFarki: fark,
    };
  }

  if (fark === 0) {
    return {
      seviye: "bugun",
      metin: lang === "en" ? "Due today" : "Bugün son gün",
      tarih,
      gunFarki: 0,
    };
  }

  if (fark === 1) {
    return {
      seviye: "yakin",
      metin: lang === "en" ? "Due tomorrow" : "Yarın son gün",
      tarih,
      gunFarki: 1,
    };
  }

  // Uc gune kadar "yakin" sayiliyor: bu, kullanicinin plan yapmak icin hala
  // vakti oldugu ama isi baslatmasi gereken araliktir.
  const seviye: AciliyetSeviyesi = fark <= 3 ? "yakin" : "normal";

  if (fark <= 30) {
    return {
      seviye,
      metin: lang === "en" ? `${fark} days left` : `${fark} gün kaldı`,
      tarih,
      gunFarki: fark,
    };
  }

  // 30 gunun otesinde "47 gün kaldı" bilgi vermiyor, hafta/ay daha okunur.
  const hafta = Math.round(fark / 7);
  if (fark <= 60) {
    return {
      seviye: "normal",
      metin: lang === "en" ? `${hafta} weeks left` : `${hafta} hafta kaldı`,
      tarih,
      gunFarki: fark,
    };
  }

  const ay = Math.round(fark / 30);
  return {
    seviye: "normal",
    metin: lang === "en" ? `${ay} months left` : `${ay} ay kaldı`,
    tarih,
    gunFarki: fark,
  };
}

/** Aciliyet seviyesinin rozet stili. */
export const SEVIYE_STILI: Record<AciliyetSeviyesi, string> = {
  gecikmis: "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/25",
  bugun: "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/25",
  yakin: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  normal: "bg-muted text-muted-foreground",
  // "Tarih yok" ile "daha cok vakit var" ayni gorunmemeli: ilki eksik bir
  // veri, ikincisi gecerli bir durum. Kesikli cerceve bunu sessizce ayiriyor.
  yok: "border border-dashed border-border text-muted-foreground",
};
