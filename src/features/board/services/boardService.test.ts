import { describe, it, expect } from 'vitest';
import { calculateFractionalPosition, normalizeCard, RawCard } from './boardService';

describe('calculateFractionalPosition', () => {
  it('iki komsu kart arasina ortalama position doner', () => {
    expect(calculateFractionalPosition(1, 3)).toBe(2);
  });

  it('sadece onceki kart varsa (listenin sonuna eklenirse) +1 doner', () => {
    expect(calculateFractionalPosition(5, undefined)).toBe(6);
  });

  it('sadece sonraki kart varsa (listenin basina eklenirse) yarisini doner', () => {
    expect(calculateFractionalPosition(undefined, 4)).toBe(2);
  });

  it('hic komsu yoksa (bos kolon) 1 doner', () => {
    expect(calculateFractionalPosition(undefined, undefined)).toBe(1);
  });

  it('ondalikli komsu position\'lari da dogru ortalar', () => {
    expect(calculateFractionalPosition(1.5, 1.75)).toBeCloseTo(1.625);
  });
});

describe('normalizeCard', () => {
  const baseRaw: RawCard = {
    id: 'card-1',
    title: 'Test karti',
    columnId: 'col-1',
  };

  it('nested assignees/labels/dependencies\'i duz yapiya cevirir', () => {
    const raw: RawCard = {
      ...baseRaw,
      description: 'aciklama',
      dueDate: '2026-08-01T00:00:00.000Z',
      position: 1.5,
      priority: 'HIGH',
      assignees: [
        { user: { id: 'u1', name: 'Ali', badges: [{ badge: { id: 'b1', name: 'Backend', color: '#000', icon: null } }] } },
      ],
      labels: [{ label: { id: 'l1', name: 'bug', color: '#f00' } }],
      blockedBy: [{ blocker: { id: 'c2', title: 'Bloklayan kart' } }],
      blocking: [{ blocked: { id: 'c3', title: 'Bloklanan kart' } }],
    };

    const task = normalizeCard(raw);

    expect(task.id).toBe('card-1');
    expect(task.description).toBe('aciklama');
    expect(task.assignees).toEqual([{ id: 'u1', name: 'Ali', badges: [{ id: 'b1', name: 'Backend', color: '#000', icon: null }] }]);
    expect(task.labels).toEqual([{ id: 'l1', name: 'bug', color: '#f00' }]);
    expect(task.blockedBy).toEqual([{ id: 'c2', title: 'Bloklayan kart', relationType: 'BLOCKS' }]);
    expect(task.blocking).toEqual([{ id: 'c3', title: 'Bloklanan kart', relationType: 'BLOCKS' }]);
  });

  it('opsiyonel alanlar eksikse null/undefined yerine bos dizi/undefined doner', () => {
    const task = normalizeCard(baseRaw);

    expect(task.description).toBeUndefined();
    expect(task.dueDate).toBeUndefined();
    expect(task.assignees).toEqual([]);
    expect(task.labels).toEqual([]);
    expect(task.blockedBy).toEqual([]);
    expect(task.blocking).toEqual([]);
  });

  it('description/dueDate null gelirse undefined\'a cevirir', () => {
    const task = normalizeCard({ ...baseRaw, description: null, dueDate: null });

    expect(task.description).toBeUndefined();
    expect(task.dueDate).toBeUndefined();
  });

  it('storyPoints sayisini oldugu gibi tasir', () => {
    const task = normalizeCard({ ...baseRaw, storyPoints: 5 });
    expect(task.storyPoints).toBe(5);
  });

  it('storyPoints null gelirse null olarak kalir (undefined\'a cevrilmez)', () => {
    const task = normalizeCard({ ...baseRaw, storyPoints: null });
    expect(task.storyPoints).toBeNull();
  });

  it('storyPoints hic gelmezse undefined doner', () => {
    const task = normalizeCard(baseRaw);
    expect(task.storyPoints).toBeUndefined();
  });
});
