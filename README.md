# Tello — Frontend

Proaktif görev yönetim aracının Next.js arayüzü.
Stack: Next.js 15 (App Router) + TypeScript · Redux Toolkit + RTK Query · Tailwind CSS · @dnd-kit

## Kurulum

Gereksinimler: Node.js 20+

```bash
git clone https://github.com/tello-workspace/tello-frontend.git
cd tello-frontend
npm install
copy .env.example .env    # Mac/Linux: cp .env.example .env
npm run dev
```

Tarayıcıda http://localhost:3000 açılmalı. Backend'e bağlanmak için backend'in de
http://localhost:4000 üzerinde çalışıyor olması gerekir (bkz. tello-backend README).

## Klasör Yapısı

```
src/
├── app/                    # Next.js App Router — her klasör bir route
│   ├── layout.tsx          # kök layout (StoreProvider burada sarar)
│   ├── page.tsx            # "/" → /projects yönlendirmesi
│   ├── login/page.tsx      # /login
│   ├── register/page.tsx   # /register
│   └── projects/
│       ├── page.tsx        # /projects (proje listesi)
│       └── [projectId]/
│           └── page.tsx    # /projects/abc123 (board ekranı)
├── lib/                    # store.ts, api.ts, StoreProvider.tsx
├── features/               # feature-folder pattern: auth/, board/ ...
└── components/             # ortak UI bileşenleri
```

Kurallar:
- Routing dosya bazlı: yeni sayfa = app/ altında yeni klasör + page.tsx
- Etkileşimli bileşenler (state, event handler, Redux hook kullananlar)
  dosyanın başına "use client" yazmak zorunda. Board tamamen client olacak.
- Bir özelliğe ait slice, hook ve bileşenler kendi feature klasöründe yaşar;
  app/ altındaki page.tsx'ler sadece bağlar, iş mantığı içermez.

## Çalışma Kuralları

Proje artık takım süreci yerine doğrudan `main` üzerinde ilerliyor — Jira kodu,
branch/PR akışı ve approval şartı kullanılmıyor.

## Ortam Değişkenleri

`.env.example` dosyasını `.env` olarak kopyala. `.env` asla commit edilmez.

| Değişken | Açıklama | Örnek |
|---|---|---|
| NEXT_PUBLIC_API_URL | Backend API adresi (tarayıcıya açık) | http://localhost:4000/api |
| NEXT_PUBLIC_SOCKET_URL | Backend Socket.IO adresi (`/api` OLMADAN) | http://localhost:4000 |
| NEXT_PUBLIC_SUPABASE_URL | Supabase proje URL'i (Google OAuth için) | Project Settings > API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon/public key (gizli değil) | Project Settings > API |
