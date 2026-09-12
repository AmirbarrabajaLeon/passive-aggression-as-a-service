# Project Status & Handoff (`PROGRESS.md`)

This file tracks the active focus, prioritized roadmap, and continuity notes for fresh agent sessions.

---

## 🎯 Current Focus
Agent governance established. Ready to begin **Phase 1: Dynamic Multi-Sticker Pool**.

---

## 📋 Prioritized Feature Roadmap

### Phase 1: Multi-Sticker & Animated WebP Pool 🏆 (Next Up)
- [ ] Create `./stickers/` directory structure with default fallback (`lion.webp`).
- [ ] Update `src/config.ts` to support directory-based sticker loading or an array of stickers.
- [ ] Update `src/dispatcher.ts` to pick randomly from the sticker pool.
- [ ] Ensure full support for animated `.webp` stickers.

### Phase 2: Stateless LLM Replier 🤖
- [ ] Integrate lightweight LLM client (e.g. Gemini Flash SDK).
- [ ] Implement stateless system prompt: generate a punchy, passive-aggressive response quoting the target's message.
- [ ] Pair LLM text response with sticker reply in `src/dispatcher.ts`.

### Phase 3: Web UI Management Dashboard ⏸️
- [ ] Minimal HTTP server (Fastify/Express) with WebSocket/SSE support.
- [ ] Web-based QR code display for pairing without terminal scrolling.
- [ ] Dashboard to switch strategies (`debounce` / `queue` / `cooldown`) and toggle target contacts.

---

## 🚧 Known Quirks & Architecture Notes

- **WhatsApp JIDs:** User contacts use phone digits + `@s.whatsapp.net` (e.g., `15551234567@s.whatsapp.net`). Group chats use `@g.us`.
- **Baileys Auth State:** Credentials and keys are saved in `auth_info_baileys/`. Never delete or tamper with this folder during restarts.
- **Safety Policy:** Do not run `pnpm dev` or `pnpm start` via autonomous agents.

---

## ⏭️ Immediate Next Step
When starting the next session, implement Phase 1: create `./stickers/` directory, update `src/config.ts` and `src/dispatcher.ts` to randomly select from available stickers, and verify with `pnpm exec tsc --noEmit`.
