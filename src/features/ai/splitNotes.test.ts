import { describe, it, expect } from 'vitest';
import { splitNotes } from './AIChatPanel';

// Onceden toplanti notu AI'ya gonderilmeden once slice(0, 4000) ile
// KESILIYORDU; uzun bir notun sonu sessizce dusuyor, kullanici eksigi fark
// etmiyordu. Bu testler bolmenin metni kaybetmedigini ve cumle ortasindan
// kesmedigini garanti ediyor.

describe('splitNotes', () => {
  it('sinirin altindaki metni bolmez', () => {
    const kisa = 'Tek paragraf.';
    expect(splitNotes(kisa, 100)).toEqual([kisa]);
  });

  it('hicbir karakter kaybolmaz', () => {
    const paragraflar = Array.from({ length: 40 }, (_, i) => `Madde ${i}: ${'x'.repeat(80)}`);
    const metin = paragraflar.join('\n\n');

    const parcalar = splitNotes(metin, 500);

    // Bolme paragraf sinirindan yapildigi icin birlestirirken ayirici geri
    // gelir; her maddenin en az bir parcada bulunmasi yeterli kanit.
    for (const p of paragraflar) {
      expect(parcalar.some((parca) => parca.includes(p))).toBe(true);
    }
  });

  it('paragraf sinirindan boler - cumle ortasindan kesmez', () => {
    const metin = ['Birinci paragraf.', 'Ikinci paragraf.', 'Ucuncu paragraf.'].join('\n\n');
    const parcalar = splitNotes(metin, 20);

    // Her parca tam paragraflardan olusmali
    for (const parca of parcalar) {
      expect(parca.endsWith('.')).toBe(true);
    }
  });

  it('her parca sinira uyar', () => {
    const metin = Array.from({ length: 30 }, (_, i) => `Satir ${i}`).join('\n\n');
    const parcalar = splitNotes(metin, 60);
    for (const parca of parcalar) {
      expect(parca.length).toBeLessThanOrEqual(60);
    }
  });

  it('tek basina sinirdan buyuk paragraf sert bolunur', () => {
    // Paragraf sinirindan bolunemeyen durum: tek bir dev blok. Kesmek yerine
    // sonsuz donguye girmemeli veya metni atmamali.
    const dev = 'y'.repeat(250);
    const parcalar = splitNotes(dev, 100);

    expect(parcalar.length).toBe(3);
    expect(parcalar.join('')).toBe(dev);
  });

  it('bos metin tek parca doner', () => {
    expect(splitNotes('', 100)).toEqual(['']);
  });
});
