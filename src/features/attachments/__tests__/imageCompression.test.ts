import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shouldCompressClient, compressImageClient } from "../imageCompression";

// jsdom'da gercek canvas/OffscreenCanvas yok — bu yüzden burada KARAR
// mantigini (shouldCompressClient) ve canvas yokken orijinalin aynen
// dondugu passthrough davranisini test ediyoruz. Gercek encode tarayicida
// dogrulanir (backend sharp zaten her durumda tekrar sikistirir).

function fakeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], `test.${type.split("/")[1] ?? "bin"}`, { type });
}

describe("shouldCompressClient", () => {
  it("buyuk jpeg/png icin true doner", () => {
    expect(shouldCompressClient(fakeFile("image/jpeg", 2 * 1024 * 1024))).toBe(true);
    expect(shouldCompressClient(fakeFile("image/png", 3 * 1024 * 1024))).toBe(true);
  });

  it("kucuk gorseller icin false doner", () => {
    expect(shouldCompressClient(fakeFile("image/jpeg", 1024))).toBe(false);
    expect(shouldCompressClient(fakeFile("image/png", 500 * 1024))).toBe(false);
  });

  it("gorsel olmayan dosyalar icin false doner", () => {
    expect(shouldCompressClient(fakeFile("application/pdf", 5 * 1024 * 1024))).toBe(false);
    expect(shouldCompressClient(fakeFile("application/zip", 8 * 1024 * 1024))).toBe(false);
  });

  it("gif/webp/svg icin false doner (sadece jpeg/png)", () => {
    expect(shouldCompressClient(fakeFile("image/gif", 2 * 1024 * 1024))).toBe(false);
    expect(shouldCompressClient(fakeFile("image/webp", 2 * 1024 * 1024))).toBe(false);
    expect(shouldCompressClient(fakeFile("image/svg+xml", 2 * 1024 * 1024))).toBe(false);
  });
});

describe("compressImageClient passthrough (canvas yok)", () => {
  beforeEach(() => {
    // OffscreenCanvas ihtimali: jsdom'de olmamali, ama yine de devre disi birak
    vi.stubGlobal("OffscreenCanvas", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sikistirilmayan dosyayi aynen doner (ayni referans)", async () => {
    const file = fakeFile("application/pdf", 1024);
    expect(await compressImageClient(file)).toBe(file);
  });

  it("canvas yokken orijinali doner, hata firlatmaz", async () => {
    const file = fakeFile("image/jpeg", 3 * 1024 * 1024);
    const result = await compressImageClient(file);
    expect(result).toBe(file);
  });
});
