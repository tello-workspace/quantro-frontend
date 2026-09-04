// Hukuki metinlerin tamami bu tek dosyadan besleniyor - veri sorumlusu
// bilgisi degistiginde uc sayfayi ayri ayri duzenlemek gerekmesin.
//
// !! DOLDURULMASI GEREKIYOR !!
// Asagidaki degerler YER TUTUCU. Gercek yayina almadan once kendi
// bilgilerinizle degistirin; KVKK m.10 veri sorumlusunun KIMLIGINI
// bildirmeyi zorunlu kiliyor, "Quantro" gibi yalnizca bir urun adi
// bu yukumlulugu karsilamaz.
export const VERI_SORUMLUSU = {
  // Gercek kisi projesi ise ad soyad, tuzel kisilik varsa unvan.
  unvan: 'Quantro (bireysel öğrenci projesi)',
  // Basvurularin ulasacagi, gercekten okunan bir adres olmali.
  eposta: 'kvkk@quantro.example',
  // Zorunlu degil ama varsa yazin.
  adres: 'Türkiye',
} as const;

// Metinlerdeki "son guncelleme" tarihi. Metni her degistirdiginizde
// guncelleyin - eski tarih, metnin guncel olmadigi izlenimi verir.
export const SON_GUNCELLEME = '4 Eylül 2026';
