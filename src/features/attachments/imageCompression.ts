// Kullanici dosyasini yuklemeden once tarayicida sikistirir (on-sikistirma):
// yuksek cozunumlu telefon fotograflari backend'e gitmeden kucultur,
// boylece hem bant genisligi hem backend belleği hem de Supabase kotasi azalir.
//
// Backend'teki karsiligi (image-compression.service.ts / attachment-policy.ts)
// ile ayni politika: jpeg/png -> WebP (max 2048px, kalite 0.82). Sadece
// gercekten kuculuyorsa yeni File doner; canvas yoksa ya da fayda yoksa
// orijinal aynen gecer. Bu bir "iyilesitirme" adimidir - hicbir zaman asil
// yuklemeyi bozmaz.

const MAX_IMAGE_DIMENSION = 2048;
const IMAGE_QUALITY = 0.82;
const CLIENT_COMPRESS_MIN_SIZE = 1.5 * 1024 * 1024; // bu boyutun alti backend'de zaten hafif

const COMPRESSIBLE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

export function shouldCompressClient(file: File): boolean {
  return COMPRESSIBLE_MIME_TYPES.has(file.type) && file.size > CLIENT_COMPRESS_MIN_SIZE;
}

export async function compressImageClient(file: File): Promise<File> {
  if (!shouldCompressClient(file)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / longestEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: "image/webp", quality: IMAGE_QUALITY });
    if (blob.size >= file.size) return file;

    return new File([blob], file.name, { type: "image/webp" });
  } catch {
    // createImageBitmap/OffscreenCanvas desteklenmiyor ya da decode hatasi:
    // orijinal dosya ile devam et, kullanici yuklemesi asla engellenmez.
    return file;
  }
}
