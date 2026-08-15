import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Alt cizgi oneki "bunu bilerek kullanmiyorum" demek. RTK Query
      // query fonksiyonlarinda sik geciyor: orgId yalnizca cache tag'i
      // uretmek icin arguman nesnesinde bulunur, istek govdesine
      // girmemesi icin destructuring ile ayiklanir (bkz. mailApi).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      // Mevcut kod tabaninda 37 yerde "any" var; hepsini simdi duzeltmek
      // ayri bir refactor. CI'i bugunku gercek duruma gore yesil baslatip
      // borcu uyari olarak gorunur tutuyoruz (backend'deki policy ile ayni).
      "@typescript-eslint/no-explicit-any": "warn",
      // Bu proje genelinde "veri yukle, sonra setState" deseni yaygin
      // (RTK Query disindaki useEffect'ler). Kurali projede tek tek
      // yeniden yapilandirmak yerine simdilik uyariya cekiyoruz.
      "react-hooks/set-state-in-effect": "warn",
      // src/lib/socket.tsx aktif gelistirme asamasinda (realtime bildirim
      // refactoru, "merge-conflict" commit'i). Ref/memoization kurallarini
      // o dosya bitene kadar uyariya cekiyoruz; baskasinin surmekte olan
      // isini yarida yeniden yapilandirmak yerine bu daha guvenli.
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
