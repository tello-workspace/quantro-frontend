'use client';

import React, { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, CalendarRange, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetProjectRoadmapQuery, useUpdateCardDatesMutation, RoadmapCard } from '../roadmapApi';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  projectId: string;
  onCardClick: (cardId: string) => void;
  /** Yonetici kenar kulplarini gorur ve sureyi surukleyebilir; uye salt-okunur. */
  canEdit?: boolean;
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

const TARIH_BICIM = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' });

export const TimelineView: React.FC<Props> = ({ projectId, onCardClick, canEdit = false }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetProjectRoadmapQuery({ projectId });
  const [updateCardDates] = useUpdateCardDatesMutation();
  const [zoom, setZoom] = useState(1); // ZOOM_KADEMELERI indeksi
  const kaydirmaRef = useRef<HTMLDivElement>(null);
  const gunPx = ZOOM_KADEMELERI[zoom];

  // Surukleme durumu. Commit pointerup'ta; arada yalnizca gun ofseti izlenir.
  // baslangicX pointerdown'daki clientX - delta gunu ondan turetilir ki zoom
  // ya da kaydirma sirasinda hedef sagsaplanmasin.
  const [surukle, setSurukle] = useState<{
    cardId: string;
    kenar: 'bas' | 'bit';
    toplamGun: number;
    baslangicX: number;
    delta: number;
  } | null>(null);
  // Son delta: pointerup kapandiginda en guncel degerin kullanilmasi icin.
  const deltaRef = useRef(0);

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

    // Satir indeksi: bagimlilik oklari cizerken her kartin dikey yerini
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

  // Bugun cizelgede gorunur olsun diye acilista oraya kaydiriyoruz - ama
  // YALNIZCA BIR KEZ. Eskiden efekt gunPx'e de bagliydi, yani her zoom
  // degisiminde kaydirma bugune geri firliyor ve kullanicinin baktigi
  // tarih araligi kayboluyordu.
  const ilkKaydirmaYapildi = useRef(false);
  useEffect(() => {
    if (!model || !kaydirmaRef.current || ilkKaydirmaYapildi.current) return;
    const bugunOfset = Math.round((Date.now() - model.baslangic.getTime()) / GUN_MS) * gunPx;
    kaydirmaRef.current.scrollLeft = Math.max(0, bugunOfset - 200);
    ilkKaydirmaYapildi.current = true;
  }, [model, gunPx]);

  // Zoom degisiminde ekranin ORTASINDAKI tarihi sabit tut. Aksi halde
  // yakinlastirmak kullaniciyi cizelgenin bambaska bir yerine atiyor.
  // useLayoutEffect: boyama oncesi duzeltiyoruz, ziplama gorunmuyor.
  const oncekiGunPx = useRef(gunPx);
  useLayoutEffect(() => {
    const el = kaydirmaRef.current;
    if (!el || oncekiGunPx.current === gunPx) return;
    const merkezGun = (el.scrollLeft + el.clientWidth / 2) / oncekiGunPx.current;
    el.scrollLeft = Math.max(0, merkezGun * gunPx - el.clientWidth / 2);
    oncekiGunPx.current = gunPx;
  }, [gunPx]);

  // ------------------------- surukleme (kenar kulplari) ---------------------

  const kaydet = useCallback(
    async (cardId: string, startDate: string | null, dueDate: string | null) => {
      try {
        await updateCardDates({ cardId, startDate, dueDate }).unwrap();
        // invalidatesTags sayesinde roadmap yeniden cekilir ve cubuk DB'deki
        // gercek surelerle hizalanir.
      } catch (err) {
        console.error('Kart süresi güncellenirken hata:', err);
      }
    },
    [updateCardDates],
  );

  const kenarBasla = (e: React.PointerEvent, c: RoadmapCard, kenar: 'bas' | 'bit') => {
    if (!canEdit || !model) return;
    e.preventDefault();
    e.stopPropagation();
    const ar = aralik(c)!;
    const toplamGun = Math.round((ar.bit.getTime() - ar.bas.getTime()) / GUN_MS);
    deltaRef.current = 0;
    setSurukle({ cardId: c.id, kenar, toplamGun, baslangicX: e.clientX, delta: 0 });
    // Pointer capture kulpun kendisine: sonraki move/up olaylari kulpla
    // konusulur, kullanici cubugun disina suruklese bile kaybolmaz.
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const kenarHareket = (e: React.PointerEvent) => {
    if (!surukle) return;
    const delta = Math.round((e.clientX - surukle.baslangicX) / gunPx);
    // Kisitla: baslangic bitisten sonraya gidemesin, cubuk en az 1 gun kalsin.
    const clamped =
      surukle.kenar === 'bas'
        ? Math.min(delta, surukle.toplamGun)
        : Math.max(delta, -surukle.toplamGun);
    deltaRef.current = clamped;
    setSurukle((prev) => (prev ? { ...prev, delta: clamped } : prev));
  };

  const kenarBirak = async () => {
    if (!surukle) return;
    const inst = surukle;
    const delta = deltaRef.current;
    deltaRef.current = 0;
    if (delta === 0) {
      setSurukle(null);
      return; // yerinden oynamadi
    }

    const kart = data?.cards.find((c) => c.id === inst.cardId);
    if (!kart) {
      setSurukle(null);
      return;
    }
    const ar = aralik(kart)!;
    try {
      // EKSIK TARAFI MADDELESTIRIYORUZ. Kartlarin cogunda yalnizca dueDate
      // var; aralik() eksik tarafi digerine esitledigi icin cubuk tek gunluk
      // gorunuyor. Eskiden kaydederken eksik taraf null biraktiliyordu, bu
      // yuzden "uzat" islemi kartin suresini uzatmiyor, tek gunluk cubugu
      // oldugu gibi baska bir gune TASIYORDU. Karsi tarafi cubugun mevcut
      // ucuna sabitleyince uzatma gercekten uzatma oluyor.
      if (inst.kenar === 'bas') {
        const yeniBas = new Date(ar.bas.getTime() + delta * GUN_MS);
        await kaydet(inst.cardId, yeniBas.toISOString(), kart.dueDate ?? ar.bit.toISOString());
      } else {
        const yeniBit = new Date(ar.bit.getTime() + delta * GUN_MS);
        await kaydet(inst.cardId, kart.startDate ?? ar.bas.toISOString(), yeniBit.toISOString());
      }
    } finally {
      // Onizleme kayit BITENE kadar duruyor. Eskiden pointerup aninda
      // temizleniyordu; istek ucarken cubuk eski yerine geri firliyor,
      // yanit gelince tekrar ziplayip yerine oturuyordu.
      setSurukle(null);
    }
  };

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

  // Akici kaydirma. Anlik atlama yerine scrollTo(behavior:'smooth') -
  // kullanici nereden nereye gittigini takip edebiliyor.
  const akiciKaydir = (hedefPx: number) => {
    kaydirmaRef.current?.scrollTo({ left: Math.max(0, hedefPx), behavior: 'smooth' });
  };
  const buguneGit = () => akiciKaydir(bugunOfset - 200);
  const haftaKaydir = (yon: 1 | -1) => {
    const el = kaydirmaRef.current;
    if (!el) return;
    akiciKaydir(el.scrollLeft + yon * 7 * gunPx);
  };
  const bugunBasi = gunBasi(new Date());

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

  // Kart cubugunun gorsel konumu. Surukleme varsa onizleme degerleri uygulanir:
  // bas kenari cekilirse sol kayar ve uzunluk ters yonde degisir, bit kenari
  // cekilirse yalnizca uzunluk degisir.
  const kartOfseti = (c: RoadmapCard, drag?: { kenar: 'bas' | 'bit'; delta: number } | null) => {
    const ar = aralik(c)!;
    let solGun = Math.round((ar.bas.getTime() - baslangic.getTime()) / GUN_MS);
    let gun = Math.round((ar.bit.getTime() - ar.bas.getTime()) / GUN_MS) + 1;
    if (drag) {
      if (drag.kenar === 'bas') {
        solGun += drag.delta;
        gun -= drag.delta;
      } else {
        gun += drag.delta;
      }
    }
    return { sol: solGun * gunPx, genislik: Math.max(gun * gunPx, 6) };
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <p className="text-xs text-muted-foreground">
          {akis.filter((a) => a.tip === 'kart').length} kart · tarihi olmayanlar listelenmez
          {canEdit && <span className="ml-2 text-muted-foreground/70">· uçlarından sürükleyip uzat</span>}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => haftaKaydir(-1)}
            aria-label={t('scrollBack')}
            title={t('scrollBack')}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={buguneGit}
            aria-label={t('goToToday')}
            title={t('goToToday')}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CalendarCheck className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => haftaKaydir(1)}
            aria-label={t('scrollForward')}
            title={t('scrollForward')}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="size-3.5" />
          </button>
          <span className="mx-1 h-4 w-px bg-border" />
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
                    const ar = aralik(c)!;
                    const drag = surukle?.cardId === c.id ? surukle : null;
                    const o = kartOfseti(c, drag);
                    // YALNIZCA surukleneni kaydir. Eskiden delta iki tarafa
                    // birden ekleniyordu; sag ucu cekerken baslangic etiketi
                    // de degisiyor, cubuk doğru boyutlanirken etiketler yalan
                    // soyluyordu.
                    const aktifBas =
                      drag?.kenar === 'bas'
                        ? new Date(ar.bas.getTime() + drag.delta * GUN_MS)
                        : ar.bas;
                    const aktifBit =
                      drag?.kenar === 'bit'
                        ? new Date(ar.bit.getTime() + drag.delta * GUN_MS)
                        : ar.bit;
                    // Gecikmis: bitis tarihi gecmis ve kart bitmemis. Kerem'in
                    // tarif ettigi "planin gerisinde kalan gorevler" ayrimi -
                    // renk zaten oncelik icin kullanildigi icin cerceve ile.
                    const gecikmis = !c.isDone && ar.bit < bugunBasi;
                    // Hover seritleri: yalnizca kartta GERCEKTEN olan tarihler
                    // gosterilir (ornek amaçli esitlenen taraf degil).
                    const basEtiketi = c.startDate ? TARIH_BICIM.format(aktifBas) : null;
                    const bitEtiketi = c.dueDate ? TARIH_BICIM.format(aktifBit) : null;

                    return (
                      <div key={c.id} className="group relative" style={{ height: SATIR_YUKSEKLIGI }}>
                        <button
                          type="button"
                          onClick={() => onCardClick(c.id)}
                          title={`${c.title} · ${c.columnName}${gecikmis ? ` · ${t('overdueLabel')}` : ''}`}
                          style={{ left: o.sol, width: o.genislik }}
                          className={`absolute top-1.5 z-20 flex h-8 items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90 ${
                            c.isDone ? 'bg-emerald-600' : (ONCELIK_RENGI[c.priority] ?? 'bg-slate-400')
                          } ${gecikmis ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-background' : ''}`}
                        >
                          <span className="truncate">{c.title}</span>
                          {c.assignees.slice(0, 2).map((a) => (
                            <Avatar key={a.id} size="sm" className="size-4 shrink-0">
                              {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt={a.name} />}
                              <AvatarFallback className="text-[8px]">{initials(a.name)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </button>

                        {/* Kenar kulplari: yoneticilerde sureyi uzatir/kisaltir.
                            Kendi pointer olaylariyla cubuk butonunun tikini
                            engellemez; hover'da belirir. */}
                        {canEdit && (
                          <>
                            <span
                              role="slider"
                              aria-label={`${c.title} başlangıç tarihi`}
                              onPointerDown={(e) => kenarBasla(e, c, 'bas')}
                              onPointerMove={kenarHareket}
                              onPointerUp={kenarBirak}
                              onPointerCancel={kenarBirak}
                              className="absolute top-1.5 z-30 h-8 w-2.5 cursor-ew-resize rounded-l-md bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 touch-none"
                              style={{ left: o.sol - 2 }}
                            />
                            <span
                              role="slider"
                              aria-label={`${c.title} bitiş tarihi`}
                              onPointerDown={(e) => kenarBasla(e, c, 'bit')}
                              onPointerMove={kenarHareket}
                              onPointerUp={kenarBirak}
                              onPointerCancel={kenarBirak}
                              className="absolute top-1.5 z-30 h-8 w-2.5 cursor-ew-resize rounded-r-md bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 touch-none"
                              style={{ left: o.sol + o.genislik - 3 }}
                            />
                          </>
                        )}

                        {/* Hover tarih seritleri: cubugun solunda baslangic,
                            saginda bitis. Suruklerken de guncel tarih canli
                            gosterilir (aktifBas/aktifBit ile). */}
                        {basEtiketi && (
                          <span
                            className={`pointer-events-none absolute z-40 whitespace-nowrap rounded-full bg-slate-900/90 px-2 py-0.5 text-[10px] font-medium text-white shadow ring-1 ring-white/20 transition-opacity group-hover:opacity-100 ${drag ? 'opacity-100' : 'opacity-0'}`}
                            style={{ left: o.sol - 6, top: '50%', transform: 'translate(-100%, -50%)' }}
                          >
                            {basEtiketi}
                          </span>
                        )}
                        {bitEtiketi && (
                          <span
                            className={`pointer-events-none absolute z-40 whitespace-nowrap rounded-full bg-slate-900/90 px-2 py-0.5 text-[10px] font-medium text-white shadow ring-1 ring-white/20 transition-opacity group-hover:opacity-100 ${drag ? 'opacity-100' : 'opacity-0'}`}
                            style={{ left: o.sol + o.genislik + 6, top: '50%', transform: 'translateY(-50%)' }}
                          >
                            {bitEtiketi}
                          </span>
                        )}
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