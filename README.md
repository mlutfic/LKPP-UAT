# LKPP FE Baru

FE baru ini adalah implementasi awal dari referensi Stitch di folder `LKPP FE baru`, dibangun dengan:

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui sebagai fondasi primitive
- global design system berbasis token dan role preset
- Storybook untuk review komponen global

Stack operasional yang dipakai saat ini:

- Vercel untuk hosting/deploy
- Supabase untuk data dan auth
- Cloudflare Turnstile untuk verifikasi login

## Prinsip arsitektur

- `Card`, `Button`, `Sidebar`, `Header`, `Table`, `FormField`, `Badge`, dan komponen inti lain harus global.
- Role seperti `user`, `resepsionis`, `unit organisasi`, `supervisor monitoring`, `humas monitoring`, dan `humas admin` hanya mengubah preset visual.
- Jangan fork komponen per role jika cukup lewat preset atau variant.

## Struktur penting

- `src/design-system`
  token, role preset, dan kontrak global
- `src/components/ui`
  primitive global
- `src/components/shell`
  shell reusable lintas role
- `src/features`
  implementasi per domain atau halaman
- `src/app`
  route Next.js
- `src/stories/lkpp`
  story untuk primitive dan shell global

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run storybook
npm run build-storybook
```

## Env dan deploy

- Produksi memakai Vercel Environment Variables, bukan file `.env.local`.
- Jalur deploy utama project ini adalah Vercel. Konfigurasi Cloudflare lama di repo tidak dipakai untuk deploy harian.
- Untuk sinkron env lokal dari project Vercel, jalankan:

```bash
npx vercel env pull .env.local --yes
```

- File lokal seperti `.env.local`, `.next`, dan artifact dev lain sengaja tidak ikut upload ke Vercel lewat `.vercelignore`.
- URL produksi aktif saat ini: `https://layananpublik-lkpp.id`
- Untuk production, set `NEXT_PUBLIC_APP_URL` dan `NEXT_PUBLIC_SITE_URL` ke `https://layananpublik-lkpp.id`.
- Turnstile aktif jika `NEXT_PUBLIC_TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY` terisi.

## Browser Automation

Kalau Anda ingin browser terasa seperti "bisa diprogram", jalur tercepat di project ini sekarang:

```bash
npm run browser:chrome:start -- --url https://example.com
npm run browser:chrome:doctor
npm run browser:task:example -- --url https://example.com
```

Workflow-nya:

- `browser:chrome:start`
  menyalakan Chrome dengan profile terpisah + `remote debugging port`
- `browser:chrome:doctor`
  mengecek apakah Chrome siap di-attach dan menampilkan daftar tab
- `browser:task`
  menjalankan task JavaScript terhadap Chrome yang sedang hidup lewat `Playwright + CDP`

Contoh task kustom:

```bash
npm run browser:task -- ./scripts/browser/tasks/example-read-page.mjs -- --url https://developers.facebook.com
```

Kalau butuh rekam flow cepat untuk halaman non-login, Anda juga bisa pakai:

```bash
npm run browser:codegen
```

## Halaman awal yang sudah disiapkan

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/layanan`
- `/resepsionis/dashboard`
- `/unit/dashboard`
- `/supervisor/dashboard`
- `/humas-monitoring/dashboard`
- `/humas-admin/dashboard`

## Catatan

Ini adalah fondasi FE baru yang terpisah dari app lama. Fokus tahap awal adalah memastikan global system dan shell reusable sudah terbentuk, lalu desain Stitch bisa diterapkan bertahap tanpa merusak role lain.
