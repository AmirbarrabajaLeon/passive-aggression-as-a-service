# Project Status & Handoff (`PROGRESS.md`)

This file tracks the active focus, prioritized roadmap, and continuity notes for fresh agent sessions.

---

## 🎯 Current Focus
Phase 1 (Dynamic Multi-Sticker Pool) completed and verified. Ready to begin **Phase 2: Stateless LLM Replier**.

---

## ✅ Recent Milestones (Last 1–2 Sessions)
- **Phase 1: Dynamic Multi-Sticker & Animated WebP Pool**
  - Migrated `lion.webp` into `./stickers/lion.webp` as foundational baseline.
  - Implemented `StickerPool` engine (`src/sticker-pool.ts`) with dynamic disk scanning.
  - Integrated Fisher-Yates Shuffle Bag algorithm guaranteeing zero back-to-back repeats.
  - Added lightweight validation (size <= 1MB, RIFF/WEBP magic bytes) and self-healing rotation cascade on invalid files.
  - Updated `src/config.ts`, `src/dispatcher.ts`, and `src/index.ts` with zero type errors.
  - Verified with comprehensive headless tests covering pool draws, multi-file shuffles, and corrupt file cascades.

---

## 📋 Prioritized Feature Roadmap

### Phase 2: Stateless LLM Replier 🤖 (Next Up)
- [ ] Integrate lightweight LLM client (e.g. Gemini Flash SDK).
- [ ] Implement stateless system prompt: generate a punchy, passive-aggressive response quoting the target's message.
- [ ] Pair LLM text response with sticker reply in `src/dispatcher.ts`.

### Phase 3: Web UI Management Dashboard ⏸️
- [ ] Minimal HTTP server (Fastify/Express) with WebSocket/SSE support.
- [ ] Web-based QR code display for pairing without terminal scrolling.
- [ ] Dashboard to switch strategies (`debounce` / `queue` / `cooldown`) and toggle target contacts.

---

## 🚧 Known Quirks & Architecture Notes

- **Stickers Pool:** `./stickers/` is the single source of truth. Stickers are scanned dynamically on trigger; both static and animated `.webp` files (<= 1MB) are supported natively. Corrupt/oversized files are safely rotated out without crashing.
- **WhatsApp JIDs:** User contacts use phone digits + `@s.whatsapp.net` (e.g., `15551234567@s.whatsapp.net`). Group chats use `@g.us`.
- **Baileys Auth State:** Credentials and keys are saved in `auth_info_baileys/`. Never delete or tamper with this folder during restarts.
- **Safety Policy:** Do not run `pnpm dev` or `pnpm start` via autonomous agents.

---

## ⏭️ Immediate Next Step
Implement Phase 2: integrate lightweight LLM SDK (Gemini Flash), craft the passive-aggressive stateless prompt quoting the target message, and pair the generated text reply with the sticker in `src/dispatcher.ts`. Verify with `pnpm exec tsc --noEmit`.
