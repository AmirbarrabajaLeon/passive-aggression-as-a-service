# Project Status & Handoff (`PROGRESS.md`)

This file tracks the active focus, prioritized roadmap, and continuity notes for fresh agent sessions.

---

## 🎯 Current Focus
Phase 1 (Dynamic Multi-Sticker Pool) completed and verified. Currently executing **Phase 2: Modular Pipeline & Decoupled Architecture** on branch `refactor/modular-pipeline` to decouple transport, guards, timing strategies, and payload generation before adding LLM dependencies.

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

### Phase 2: Modular Pipeline & Headless Architecture 🏗️ (Current Focus)
- [ ] **Transport Layer (`src/transport/`):** Encapsulate Baileys lifecycle, auth, QR/pairing codes, LID/phone mappings, and raw event normalization into a clean `WhatsAppTransport` implementing `MessageTransport`.
- [ ] **Guard & Filter Pipeline (`src/guards/`):** Pure functions for target phone/group matching, history suppression, sticker loop protection, and self-test rules.
- [ ] **Strategy Engine (`src/strategies/`):** Decouple `debounce`, `queue`, and `cooldown` into individual strategy classes conforming to `ReplyStrategy`.
- [ ] **Payload Generator Interface (`src/generators/`):** Wrap `StickerPool` under `StickerPayloadGenerator` conforming to `PayloadGenerator`, creating a clean plug-in slot for LLM text retorts.
- [ ] **Dispatcher Orchestrator (`src/dispatcher/`):** Slim down orchestrator to a clean, readable coordinator gluing transport, guards, active strategy, and generator.
- [ ] **Headless Test Suite:** Add fast, deterministic mock tests covering timing strategies, cooldown, and filter matching without requiring a live WhatsApp connection.

### Phase 3: Stateless LLM Replier 🤖 (Next Up)
- [ ] Integrate lightweight LLM client (e.g. Gemini Flash SDK).
- [ ] Implement stateless system prompt: generate a punchy, passive-aggressive response quoting the target's message.
- [ ] Implement `LlmRetortGenerator` / composite generator pairing LLM text retorts with sticker replies.

### Phase 4: Web UI Management Dashboard ⏸️
- [ ] Minimal HTTP server (Fastify/Express) with WebSocket/SSE support.
- [ ] Web-based QR code display for pairing without terminal scrolling.
- [ ] Dashboard to switch strategies (`debounce` / `queue` / `cooldown`) and toggle target contacts at runtime.

---

## 🚧 Known Quirks & Architecture Notes

- **Stickers Pool:** `./stickers/` is the single source of truth. Stickers are scanned dynamically on trigger; both static and animated `.webp` files (<= 1MB) are supported natively. Corrupt/oversized files are safely rotated out without crashing.
- **Architectural Pattern (Anti-Overengineering Guideline):** Use a **Modular Pipeline / Vertical Slice** layout (`transport` -> `guards` -> `strategies` -> `generators` -> `dispatcher`). Avoid enterprise DDD/CQRS ceremony (Aggregates, Command Buses, Repositories); keep modules decoupled, single-purpose, and headless-testable.
- **WhatsApp JIDs:** User contacts use phone digits + `@s.whatsapp.net` (e.g., `15551234567@s.whatsapp.net`). Group chats use `@g.us`.
- **Baileys Auth State:** Credentials and keys are saved in `auth_info_baileys/`. Never delete or tamper with this folder during restarts.
- **Safety Policy:** Do not run `pnpm dev` or `pnpm start` via autonomous agents.

---

## ⏭️ Immediate Next Step
Establish core contracts/types (`MessageTransport`, `InboundMessage`, `ReplyStrategy`, `PayloadGenerator`) and extract pure guard functions into `src/guards/` to begin modularizing [whatsapp.ts](file:///home/leonejo/projects/passive-aggression-as-a-service/src/whatsapp.ts) and [dispatcher.ts](file:///home/leonejo/projects/passive-aggression-as-a-service/src/dispatcher.ts). Verify with `pnpm exec tsc --noEmit`.
