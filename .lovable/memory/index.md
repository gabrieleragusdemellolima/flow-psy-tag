# Memory: index.md

# Project Memory

## Core
- React + TS, Zustand, Supabase (RLS).
- No auth required; default Admin privileges everywhere.
- Operator identifies via name+number on entry (localStorage), saved on every transaction.
- Electron desktop app + PWA offline-first (IndexedDB) with sync.
- Dark Psytrance aesthetic: OLED black, acid neon (green/purple/orange).
- Loud environments: Audio feedback for transactions/tags.

## Memories
- [Psytrance Aesthetic](mem://style/psytrance-aesthetic) — Visual design guidelines using OLED black and acid neon colors
- [NFC Payments & ACR122U](mem://features/nfc-payments) — Cashless payments using Web NFC and WebUSB ACR122U integration
- [Entry & Parking](mem://features/entry-management) — Auto-sequential ticketing and parking control via Postgres triggers
- [Staff Consumption](mem://features/staff-consumption) — Separate credits tracking for operational staff
- [Profit Tracking](mem://features/profit-tracking) — Cost price tracking for margin calculation
- [PWA & Offline](mem://platform/pwa-deployment) — IndexedDB offline sync and PDF report exports
- [POS Layout](mem://ui/pos-usability) — Mobile/tablet optimized POS with collapsible NFC and independent cart scroll
- [Stock Control](mem://features/stock-control) — Real-time stock tracking and visual low-stock alerts
- [Face ID Profiles](mem://features/face-id-customer-profiles) — Customer profiles with biometric facial recognition and NFC binding
- [Electron Desktop](mem://platform/electron-desktop) — Native Windows desktop distribution settings
- [Audio Feedback](mem://ui/feedback-indicators) — Sound alerts for noisy festival environments
- [Operator Identification](mem://features/operator-identification) — Manual name+number per session, saved per transaction
