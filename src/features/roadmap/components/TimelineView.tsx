'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, CalendarRange } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetProjectRoadmapQuery, RoadmapCard } from '../roadmapApi';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  projectId: string;
  onCardClick: (cardId: string) => void;
}

const GUN_MS = 24 * 60 * 60 * 1000;
const SATIR_YUKSEKLIGI = 44; // px - cubuk + bosluk
const BASLIK_GENISLIGI = 220; // px - sol sabit kart adi sutunu
const ZOOM_KADEMELERI = [8, 14, 22, 34]; // gun basina px

const ONCELIK_RENGI: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-slate-400',
};

function gunBasi(d: Date): Date {
  const k = new Date(d);
  k.setHours(0, 0, 0, 0);
  return k;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

// Karti zaman cizelgesinde konumlandirmak icin baslangic/bitis. Yalnizca bir
// tarihi olan kartlar da cizilebilmeli: eksik olan taraf diger tarihe
// esitlenir ve kart tek gunluk bir isaret olarak gorunur.
function aralik(c: RoadmapCard): { bas: Date; bit: Date } | null {
  const s = c.startDate ? gunBasi(new Date(c.startDate)) : null;
  const e = c.dueDate ? gunBasi(new Date(c.dueDate)) : null;
  if (!s && !e) return null;
  const bas = s ?? e!;
  const bit = e ?? s!;
  // Bitis baslangictan onceyse (veri hatasi) tek gunluk gosteriyoruz
  return bit < bas ? { bas, bit: bas } : { bas, bit };
}

export const TimelineView: React.FC<Props> = ({ projectId, onCardClick }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetProjectRoadmapQuery({ projectId });
  const [zoom, setZoom] = useState(1); // ZOOM_KADEMELERI indeksi
  const kaydirmaRef = useRef<HTMLDivElement>(null);
  const gunPx = ZOOM_KADEMELERI[zoom];

  const model = useMemo(() => {
    if (!data) return null;

    const aralikli = data.cards
      .map((c) => ({ card: c, ar: aralik(c) }))
      .filter((x): x is { card: RoadmapCard; ar: { bas: Date; bit: Date } } => !!x.ar);

    if (aralikli.length === 0) return null;

    // Cizelge sinirlari: en erken baslangic ve en gec bitis, iki yana birer
    // hafta pay birakilarak - cubuklar kenara yapisik durmasin.
    let min = aralikli[0].ar.bas;
    let max = aralikli[0].ar.bit;
    for (const { ar } of aralikli) {
      if (ar.bas < min) min = ar.bas;
      if (ar.bit > max) max = ar.bit;
    }
    const baslangic = new Date(min.getTime() - 7 * GUN_MS);
    const bitis = new Date(max.getTime() + 7 * GUN_MS);
    const toplamGun = Math.round((bitis.getTime() - baslangic.getTime()) / GUN_MS) + 1;

    // Epic'e gore gruplama: ust karti olanlar o baslik altinda toplaniyor,
    // olmayanlar "Bagimsiz" grubunda. Gruplar zaman cizelgesini okunur
    // kiliyor - duz bir liste 80 kartta anlamsizlasiyor.
    const parentAdi = new Map(data.parents.map((p) => [p.id, p.title]));
    const gruplar = new Map<string, { baslik: string; satirlar: typeof aralikli }>();

    for (const item of aralikli) {
      const anahtar = item.card.parentCardId ?? '__bagimsiz__';
      if (!gruplar.has(anahtar)) {
        gruplar.set(anahtar, {
          baslik: item.card.parentCardId
            ? (parentAdi.get(item.card.parentCardId) ?? 'Üst kart')
            : 'Bağımsız',
          satirlar: [],
        });
      }
      gruplar.get(anahtar)!.satirlar.push(item);
    }

    // Satir indeksi: bagimlilik oklarini cizerken her kartin dikey yerini
    // bilmemiz gerekiyor, gruplar arasi baslik satirlari da sayiliyor.
    const satirIndeksi = new Map<string, number>();
    let y = 0;
    const akis:({ tip: 'grup'; baslik: string } | { tip: 'kart'; item: (typeof aralikli)[number] })[] = [];
    for (const [, g] of gruplar) {
      akis.push({ tip: 'grup', baslik: g.baslik });
      y += 1;
      for (const item of g.satirlar) {
        satirIndeksi.set(item.card.id, y);
        akis.push({ tip: 'kart', item });
        y += 1;
      }
    }

    return { baslangic, toplamGun, akis, satirIndeksi };
  }, [data]);

  // Bugun cizelgede gorunur olsun diye acilista oraya kaydiriyoruz.
  useEffect(() => {
    if (!model || !kaydirmaRef.current) return;
    const bugunOfset = Math.round((Date.now() - model.baslangic.getTime()) / GUN_MS) * gunPx;
    kaydirmaRef.current.scrollLeft = Math.max(0, bugunOfset - 200);
  }, [model, gunPx]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarRange className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-foreground">{t('noTimelineCards')}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Kartlara başlangıç veya bitiş tarihi ekleyince burada görünürler.
        </p>
      </div>
    );
  }

  const { baslangic, toplamGun, akis, satirIndeksi } = model;
  const genislik = toplamGun * gunPx;
  const bugunOfset = Math.round((gunBasi(new Date()).getTime() - baslangic.getTime()) / GUN_MS) * gunPx;

  // Ay basliklari: gun gun etiket basmak okunmaz olurdu, ay sinirlarini
  // isaretleyip aradaki gunlere ince cizgi birakiyoruz.
  const aylar: { ofset: number; etiket: string }[] = [];
  for (let i = 0; i < toplamGun; i++) {
    const g = new Date(baslangic.getTime() + i * GUN_MS);
    if (g.getDate() === 1 || i === 0) {
      aylar.push({
        ofset: i * gunPx,
        etiket: g.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
      });
    }
  }

  const kartOfseti = (c: RoadmapCard) => {
    const ar = aralik(c)!;
    const sol = Math.round((ar.bas.getTime() - baslangic.getTime()) / GUN_MS) * gunPx;
    const gun = Math.round((ar.bit.getTime() - ar.bas.getTime()) / GUN_MS) + 1;
    return { sol, genislik: Math.max(gun * gunPx, 6) };
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <p className="text-xs text-muted-foreground">
          {akis.filter((a) => a.tip === 'kart').length} kart · tarihi olmayanlar listelenmez
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0, z - 1))}
            disabled={zoom === 0}
            aria-label={t('zoomOut')}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_KADEMELERI.length - 1, z + 1))}
            disabled={zoom === ZOOM_KADEMELERI.length - 1}
            aria-label={t('zoomIn')}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <ZoomIn className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sol sabit sutun: kaydirirken kart adlari kaybolmasin */}
        <div
          className="shrink-0 overflow-hidden border-r border-border"
          style={{ width: BASLIK_GENISLIGI }}
        >
          <div className="h-9 border-b border-border" />
          <div className="overflow-hidden">
            {akis.map((satir, i) =>
              satir.tip === 'grup' ? (
                <div
                  key={`g-${i}`}
                  className="flex items-center truncate bg-muted/40 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ height: SATIR_YUKSEKLIGI }}
                >
                  {satir.baslik}
                </div>
              ) : (
                <button
                  key={satir.item.card.id}
                  type="button"
                  onClick={() => onCardClick(satir.item.card.id)}
                  className="flex w-full items-center gap-2 truncate px-3 text-left text-sm transition-colors hover:bg-accent/50"
                  style={{ height: SATIR_YUKSEKLIGI }}
                >
                  <span className="truncate">{satir.item.card.title}</span>
                </button>
              ),
            )}
          </div>
        </div>

        {/* Sag: kaydirilabilir zaman alani */}
        <div ref={kaydirmaRef} className="min-w-0 flex-1 overflow-auto">
          <div style={{ width: genislik }}>
            {/* Ay seridi */}
            <div className="sticky top-0 z-10 flex h-9 border-b border-border bg-background">
              {aylar.map((a, i) => (
                <span
                  key={i}
                  className="absolute flex h-9 items-center border-l border-border px-2 text-xs font-medium text-muted-foreground"
                  style={{ left: a.ofset }}
                >
                  {a.etiket}
                </span>
              ))}
            </div>

            <div className="relative">
              {/* Bugun cizgisi */}
              {bugunOfset >= 0 && bugunOfset <= genislik && (
                <div
                  aria-hidden
                  className="absolute top-0 bottom-0 z-20 w-px bg-primary"
                  style={{ left: bugunOfset }}
                >
                  <span className="absolute -top-0 -left-1 size-2 rounded-full bg-primary" />
                </div>
              )}

              {/* Bagimlilik oklari: SVG katmani cubuklarin altinda kaliyor ki
                  kartlarin uzerine tiklanabilirlik bozulmasin. */}
              <svg
                className="pointer-events-none absolute inset-0 z-10"
                width={genislik}
                height={akis.length * SATIR_YUKSEKLIGI}
              >
                {data!.dependencies.map((d, i) => {
                  const blokerSatir = satirIndeksi.get(d.blockerId);
                  const bloklananSatir = satirIndeksi.get(d.blockedId);
                  if (blokerSatir === undefined || bloklananSatir === undefined) return null;

                  const bloker = data!.cards.find((c) => c.id === d.blockerId);
                  const bloklanan = data!.cards.find((c) => c.id === d.blockedId);
                  if (!bloker || !bloklanan) return null;

                  const b1 = kartOfseti(bloker);
                  const b2 = kartOfseti(bloklanan);
                  const x1 = b1.sol + b1.genislik;
                  const y1 = blokerSatir * SATIR_YUKSEKLIGI + SATIR_YUKSEKLIGI / 2;
                  const x2 = b2.sol;
                  const y2 = bloklananSatir * SATIR_YUKSEKLIGI + SATIR_YUKSEKLIGI / 2;
                  const orta = x1 + Math.max(12, (x2 - x1) / 2);

                  return (
                    <path
                      key={i}
                      d={`M ${x1} ${y1} H ${orta} V ${y2} H ${x2}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      className="text-muted-foreground/50"
                      markerEnd="url(#ok)"
                    />
                  );
                })}
                <defs>
                  <marker id="ok" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0 1 L6 4 L0 7 z" className="fill-muted-foreground/60" />
                  </marker>
                </defs>
              </svg>

              {akis.map((satir, i) =>
                satir.tip === 'grup' ? (
                  <div
                    key={`g-${i}`}
                    className="bg-muted/40"
                    style={{ height: SATIR_YUKSEKLIGI }}
                  />
                ) : (
                  (() => {
                    const c = satir.item.card;
                    const o = kartOfseti(c);
                    return (
                      <div key={c.id} className="relative" style={{ height: SATIR_YUKSEKLIGI }}>
                        <button
                          type="button"
                          onClick={() => onCardClick(c.id)}
                          title={`${c.title} · ${c.columnName}`}
                          style={{ left: o.sol, width: o.genislik }}
                          className={`absolute top-1.5 z-20 flex h-8 items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90 ${
                            c.isDone ? 'bg-emerald-600' : (ONCELIK_RENGI[c.priority] ?? 'bg-slate-400')
                          }`}
                        >
                          <span className="truncate">{c.title}</span>
                          {c.assignees.slice(0, 2).map((a) => (
                            <Avatar key={a.id} size="sm" className="size-4 shrink-0">
                              {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt={a.name} />}
                              <AvatarFallback className="text-[8px]">{initials(a.name)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </button>
                      </div>
                    );
                  })()
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
