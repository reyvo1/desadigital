# BUKTI-REVISI-03

## A — Tampilan token + hapus fallback Lunas
- viewsGuard.test.ts: PASS (5 subtests).
- Mutation check: menghapus header Authorization dari citizenApi membuat viewsGuard? (guard source) dan unit citizenApi 401 -> ok:false. Lulus setelah perbaikan.
- CitizenPortalView.tsx: fetch lewat citizenApi, tidak ada 'Fallback local' / status 'Lunas' klien.
- SaasPlatformView.tsx: fetch lewat saasApi, token admin platform.

## B — Security regression (mandiri)
- npm run security: LULUS (termasuk isolasi KK, billing, pay-bill, confirm/reject, OTP).

## C — security-prod
- npm run security-prod: [OK] OTP not leaked in production response.
- CI: step terpisah setelah Build.

## D — server.ts
- confirm/reject dibatasi super_admin/kades.
- pay-bill idempoten + unique index handling.
- GET /api/citizen/bills + paymentStatus.
- OTP anti-enumeration cooldown per NIK, pgAdapter check prod, dispatch gagal -> failed + masked.

## E — Rapikan
- scenario-billing: idempoten (terima sudah dibayar).
- CHANGES-HERMES.md diperbarui.
- seed-dummy aman + SEED_ADMIN_PASSWORD.

## Bukti perintah
- npm run lint: PASS (0 error)
- npm test: 26 pass, 0 fail
- npm run build: OK
- npm run security: LULUS
- npm run security-prod: [OK] OTP not leaked
- git diff --stat: lihat repo

## Status butir
- A: SELESAI
- B: SELESAI (mandiri, tanpa seed)
- C: SELESAI
- D: SELESAI
- E: SELESAI (dokumentasi akurat)