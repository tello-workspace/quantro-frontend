import { defineConfig } from "vitest/config";
import { resolve } from "path";

// @vitejs/plugin-react kurulamadi (shadcn'in babel@7 zinciriyle
// @vitejs/plugin-react'in babel@8-rc bagimliligi cakisiyor) - Vitest 4'un
// varsayilan oxc transformer'i JSX'i zaten otomatik runtime ile destekliyor,
// Fast Refresh testte gerekmiyor.
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
