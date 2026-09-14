# Project Status & Handoff (`PROGRESS.md`)

This file tracks the active focus, prioritized roadmap, and continuity notes for fresh agent sessions.

---

## 🎯 Current Focus

Phase 3 (Stateless LLM Replier) is **complete and verified**. Ready to begin **Phase 4: Web UI Management Dashboard** or tackle the deferred headless test suite (vitest).

---

## ✅ Recent Milestones (Last 1–2 Sessions)

- **Phase 3: Stateless LLM Replier** (`feat/llm-retort`)
  - Installed `openai` SDK (v7.15.0) — OpenAI-compatible, provider-agnostic.
  - Added `ReplyFormat` type + four new env-backed fields (`llmApiKey`, `llmBaseUrl`, `llmModel`, `replyFormat`) to `src/config.ts`.
  - Created `prompts/system.md`: editable bot persona template with `{{text}}` placeholder injection.
  - Implemented `LlmRetortGenerator` in `src/generators/llm.ts`: stateless, 8s timeout guard, silent `null` fallback on any failure.
  - Implemented `CompositePayloadGenerator` in `src/generators/composite.ts`: coordinates `combo | text | sticker` modes via `Promise.all()` in combo mode for parallel LLM + sticker generation.
  - Updated `WhatsAppTransport.send()` to deliver quoted text retorts, with a human-like 800–1400ms pause before the sticker in combo mode.
  - Swapped `Dispatcher` from `StickerPayloadGenerator` → `CompositePayloadGenerator` (2 lines changed).
  - Updated startup banner in `src/index.ts` to surface LLM model and reply format.
  - Updated `.env.example` with full LLM config block and provider-swap instructions.
  - Verified: `pnpm exec tsc --noEmit` exits 0.

- **Phase 2: Modular Pipeline & Headless Architecture** ✅ Complete
- **Phase 1: Dynamic Multi-Sticker & Animated WebP Pool** ✅ Complete

---

## 📋 Prioritized Feature Roadmap

### Phase 3: Stateless LLM Replier 🤖 ✅ Complete
- [x] Install `openai` SDK (OpenAI-compatible, provider-agnostic).
- [x] `prompts/system.md`: external, editable persona template.
- [x] `LlmRetortGenerator`: stateless, timeout-guarded, null-fallback on failure.
- [x] `CompositePayloadGenerator`: orchestrates `combo | text | sticker` modes.
- [x] `WhatsAppTransport.send()`: text retort + human pause + sticker egress.
- [x] Config, startup banner, `.env.example` updated.

### Deferred: Headless Test Suite 🧪
- [ ] Add `vitest` as a dev dependency.
- [ ] Write headless unit tests for guards, strategies, and generators (including mocked LLM responses).

### Phase 4: Web UI Management Dashboard & SQLite Event Logging ⏸️
- [ ] Minimal HTTP server (Fastify/Express) with WebSocket/SSE support.
- [ ] Web-based QR code display for pairing without terminal scrolling.
- [ ] Multi-persona CRUD & live editor (create, edit, switch personas on the fly).
- [ ] Sticker gallery with "Hype Train" weighting (boost frequency of trending meme stickers).
- [ ] Toggle `REPLY_FORMAT` (`combo` / `text` / `sticker`) and switch strategies at runtime.
- [ ] Toggle target contacts at runtime without restarting.
- [ ] Lightweight SQLite logging for interaction history and roast stats.

### Phase 5: Semantic Sticker Indexing & Cognitive Mood Engine 🎭
- [ ] Subfolder sticker categorization (`./stickers/smug/`, `./stickers/disdain/`, `./stickers/chill/`).
- [ ] Extend `StickerPool` to draw non-repeating shuffles from specific mood categories.
- [ ] Structured LLM action matrix: `{ stance, action, text, sticker_category, delay }`.
- [ ] Dynamic behavior stances: cocky, tsundere, chill, or deliberate ignore/cooldown.
- [ ] `FatigueStrategy`: dynamic probability decay & escalating cooldowns with stamina recovery.

### Phase 6: WhatsApp-Native HITL & Target Dossiers 📲 (Future Exploration)
- [ ] WhatsApp-Native Approval Loop: ping your personal WhatsApp DM when confidence is low with 1-tap options.
- [ ] Target Dossiers: lightweight markdown files (`prompts/targets/<friend>.md`) for personal lore and surgical roasts.

---

## 🚧 Known Quirks & Architecture Notes

- **LLM Provider Swap:** Set `LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL` in `.env` to switch between Gemini Flash, Groq (Llama 3), OpenRouter, or local Ollama. Zero code changes required.
- **LLM Disabled Gracefully:** If `LLM_API_KEY` is blank, `LlmRetortGenerator` returns `null` immediately. `CompositePayloadGenerator` falls back to sticker-only so the bot never goes silent.
- **Prompt File:** `prompts/system.md` is read once at startup and cached in memory. Edit it, restart the bot. Phase 4 Web UI will hot-reload it via the dashboard.
- **Combo Latency:** In `combo` mode, LLM API call and sticker disk-scan run in parallel via `Promise.all()`. Net latency ≈ max(LLM, disk) not their sum. Gemini Flash typically responds in 1–2s.
- **Stickers Pool:** `./stickers/` is the single source of truth. Both static and animated `.webp` files (<= 1MB) are supported.
- **Safety Policy:** Do not run `pnpm dev` or `pnpm start` via autonomous agents.

---

## ⏭️ Immediate Next Steps

Choose one:
1. **Headless Test Suite:** Add `vitest`, write mocked unit tests for `LlmRetortGenerator` and `CompositePayloadGenerator` — high value for catching regressions.
2. **Phase 4 Web UI:** Scaffold Fastify server, SSE endpoint, and a minimal dashboard to manage the bot without terminal access.
3. **Multimodal Vision (Shelved):** Revisit once a cheap visual captioning model is wired into `WhatsAppTransport.extractText()` to convert incoming images into text before passing to the LLM.


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
