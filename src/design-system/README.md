# LKPP FE Global System

## Tujuan

FE baru ini dibangun dengan pola `global system` supaya perubahan pada primitive inti merambat ke semua role tanpa membuat fork komponen per halaman.

## Lapisan sistem

1. `src/design-system`
   Sumber kebenaran untuk role preset, token, dan kontrak visual.
2. `src/components/ui`
   Primitive global seperti `AppButton`, `AppCard`, `AppStatCard`, `AppInput`, `AppTable`.
3. `src/components/shell`
   Shell reusable seperti `AppHeader`, `AppSidebar`, `AppMobileNav`, `AuthShell`, `DashboardShell`.
4. `src/features`
   Implementasi halaman atau modul per domain, bukan tempat membuat primitive baru.
5. `src/app`
   Route layer Next.js App Router.

## Prinsip globalisasi

- Struktur komponen tetap global.
- Role hanya mengubah preset visual melalui `data-role-theme` dan `roleThemes`.
- Jangan fork `Card`, `Sidebar`, `Header`, `Table`, atau `FormField` hanya untuk beda warna atau tone.

## Source of truth

- Token dasar ada di `src/app/globals.css`.
- Preset role ada di `src/design-system/roles.ts`.
- Primitive inti ada di `src/components/ui`.
- Shell lintas role ada di `src/components/shell`.
- Hierarchy ukuran dan detail primitive ada di `UI-HIERARCHY.md`.

## Cara extend

- Jika mau menambah role baru, tambahkan preset di `roles.ts`.
- Jika mau mengubah card untuk semua role, ubah `AppCard` atau `AppStatCard`.
- Jika mau mengubah seluruh sidebar, ubah `AppSidebar`.
- Jika mau mengubah seluruh topbar, ubah `AppHeader`.

## Target arsitektur

Satu perubahan kecil pada primitive inti harus memberi efek luas, tetapi tanpa merusak karakter visual role karena preset tetap tersentralisasi.
