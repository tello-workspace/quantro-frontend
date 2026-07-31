import { describe, it, expect } from 'vitest';
import { extractMentionQuery, filterMentionCandidates, insertMention } from './mentionUtils';

describe('extractMentionQuery', () => {
  it('@ ile biten metinde bos sorgu doner', () => {
    expect(extractMentionQuery('merhaba @')).toBe('');
  });

  it('@kelime icin kucuk harfe cevrilmis sorgu doner', () => {
    expect(extractMentionQuery('bak @Mehmet')).toBe('mehmet');
  });

  it('turkce karakterli isimleri destekler', () => {
    expect(extractMentionQuery('cc @Şeyma')).toBe('şeyma');
  });

  it('@ metnin sonunda degilse null doner', () => {
    expect(extractMentionQuery('@mehmet bir sey yazdi devam ediyor')).toBeNull();
  });

  it('hic @ yoksa null doner', () => {
    expect(extractMentionQuery('sadece duz metin')).toBeNull();
  });

  it('@ sonrasi bosluk gelirse (mention tamamlanmis) null doner', () => {
    expect(extractMentionQuery('@mehmet ')).toBeNull();
  });
});

describe('filterMentionCandidates', () => {
  const members = [
    { user: { id: '1', name: 'Mehmet Yılmaz' } },
    { user: { id: '2', name: 'Zeynep Kaya' } },
    { user: { id: '3', name: 'Ahmet Mehmetoğlu' } },
    { user: { id: '4', name: 'Ayşe Demir' } },
    { user: { id: '5', name: 'Can Öz' } },
    { user: { id: '6', name: 'Deniz Su' } },
  ];

  it('ismi sorguyu icerenleri buyuk/kucuk harf duyarsiz filtreler', () => {
    const result = filterMentionCandidates(members, 'mehmet');
    expect(result.map((m) => m.user.name)).toEqual(['Mehmet Yılmaz', 'Ahmet Mehmetoğlu']);
  });

  it('bos sorguda ilk 5 uyeyi doner (varsayilan limit)', () => {
    const result = filterMentionCandidates(members, '');
    expect(result.length).toBe(5);
  });

  it('eslesme yoksa bos dizi doner', () => {
    expect(filterMentionCandidates(members, 'xyz')).toEqual([]);
  });

  it('limit parametresi ile sinirlandirilabilir', () => {
    expect(filterMentionCandidates(members, '', 2).length).toBe(2);
  });
});

describe('insertMention', () => {
  it('sondaki @kelime parcasini tam isimle degistirir ve sona bosluk ekler', () => {
    expect(insertMention('bak @meh', 'Mehmet Yılmaz')).toBe('bak @Mehmet Yılmaz ');
  });

  it('sadece @ varsa da calisir', () => {
    expect(insertMention('selam @', 'Zeynep')).toBe('selam @Zeynep ');
  });
});
