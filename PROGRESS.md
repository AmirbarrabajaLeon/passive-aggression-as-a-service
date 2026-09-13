# Project Status & Handoff (`PROGRESS.md`)

This file tracks the active focus, prioritized roadmap, and continuity notes for fresh agent sessions.

---

## 🎯 Current Focus
Phase 1 (Dynamic Multi-Sticker Pool) and **Phase 2 (Modular Pipeline Architecture)** are both complete and verified. Ready to begin **Phase 3: Stateless LLM Replier**.

---

## ✅ Recent Milestones (Last 1–2 Sessions)
- **Phase 2: Modular Pipeline & Headless Architecture** (`refactor/modular-pipeline`)
  - Defined core contracts in `src/types.ts` (`InboundMessage`, `OutboundPayload`, `PayloadGenerator`, `ReplyStrategy`).
  - Extracted pure guard functions into `src/guards/` (`isStickerLoop`, `isHistoryMessage`, `isTargetMatch`, `isTargetGroup`, `isSelfTestAllowed`).
  - Split timing logic into `src/strategies/` (`DebounceStrategy`, `QueueStrategy`, `CooldownStrategy`) behind `ReplyStrategy`; factory via `buildStrategy()`.
  - Wrapped `StickerPool` under `StickerPayloadGenerator` in `src/generators/` — Phase 3 LLM plug-in slot ready.
  - Extracted all Baileys concerns into `src/transport/WhatsAppTransport`; dispatcher no longer holds a `WASocket` reference.
  - Slimmed `src/dispatcher.ts` from 250 to ~65 lines; now a pure coordinator.
  - Deleted `src/whatsapp.ts`. Verified: `pnpm exec tsc --noEmit` exits 0.
- **Phase 1: Dynamic Multi-Sticker & Animated WebP Pool**
  - Migrated `lion.webp` into `./stickers/lion.webp` as foundational baseline.
  - Implemented `StickerPool` engine (`src/sticker-pool.ts`) with dynamic disk scanning.
  - Integrated Fisher-Yates Shuffle Bag algorithm guaranteeing zero back-to-back repeats.
  - Added lightweight validation (size <= 1MB, RIFF/WEBP magic bytes) and self-healing rotation cascade on invalid files.
  - Updated `src/config.ts`, `src/dispatcher.ts`, and `src/index.ts` with zero type errors.
  - Verified with comprehensive headless tests covering pool draws, multi-file shuffles, and corrupt file cascades.

---

## 📋 Prioritized Feature Roadmap

### Phase 2: Modular Pipeline & Headless Architecture 🏗️ ✅ Complete
- [x] **Transport Layer (`src/transport/`):** `WhatsAppTransport` encapsulates all Baileys lifecycle, auth, QR/pairing, LID mapping, normalization, and egress `send()`.
- [x] **Guard & Filter Pipeline (`src/guards/`):** Pure functions for target matching, history suppression, sticker loop protection, and self-test rules.
- [x] **Strategy Engine (`src/strategies/`):** `DebounceStrategy`, `QueueStrategy`, `CooldownStrategy` each implement `ReplyStrategy`; factory via `buildStrategy()`.
- [x] **Payload Generator Interface (`src/generators/`):** `StickerPayloadGenerator` implements `PayloadGenerator` — Phase 3 LLM generator plug-in slot ready.
- [x] **Dispatcher Orchestrator (`src/dispatcher.ts`):** Slimmed from 250 to ~65 lines; pure coordinator.
- [ ] **Headless Test Suite:** Deferred to follow-up task (vitest not yet added).

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
Begin Phase 3: add Gemini Flash SDK (`@google/generative-ai`), implement `LlmRetortGenerator` in `src/generators/llm-retort.ts` implementing `PayloadGenerator`, craft a stateless passive-aggressive system prompt quoting the target's message, and compose it with `StickerPayloadGenerator` in the dispatcher. Verify with `pnpm exec tsc --noEmit`.
