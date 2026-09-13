# Agent Guidelines & Workflow (`AGENTS.md`)

Welcome! This document provides operational boundaries, architectural context, and verification workflows for AI agents working in this repository (compatible with Antigravity, OpenCode TUI, Codex, and Claude Code).

---

## 🏗️ Project Architecture & Tech Stack

- **Project:** `passive-aggression-as-a-service` (`whatsapp-pubsub-sticker`)
- **Runtime:** Node.js (ESM, Node 20+)
- **Language:** TypeScript (`tsconfig.json`) executed via `tsx`
- **Core Library:** `@whiskeysockets/baileys` (direct WhatsApp Web WebSocket protocol)
- **Logging:** `pino` logger with structured formatting
- **Package Manager:** Strictly `pnpm` (version locked via `packageManager` in `package.json`). **Do not use `npm` or `yarn`.**

---

## 🔀 Pipeline Architecture

All messages flow through a strict, one-way pipeline. **Never collapse these layers.**

```
Baileys WebSocket
      │
      ▼
┌─────────────────────────────────┐
│  src/transport/                 │  ← ONLY layer that may import Baileys
│  WhatsAppTransport              │    Handles: auth, QR/pairing, LID mapping,
│                                 │    messages.upsert normalization, egress send()
└─────────────────┬───────────────┘
                  │ emits InboundMessage
                  ▼
┌─────────────────────────────────┐
│  src/guards/                    │  ← Pure filter functions (no side effects)
│  isStickerLoop, isTargetMatch…  │    Headless-testable, zero Baileys dependency
└─────────────────┬───────────────┘
                  │ passes / drops
                  ▼
┌─────────────────────────────────┐
│  src/strategies/                │  ← Timing/scheduling only
│  DebounceStrategy, QueueStrategy│    Implements ReplyStrategy interface
│  CooldownStrategy               │    No knowledge of stickers, LLM, or sockets
└─────────────────┬───────────────┘
                  │ fires callback when timing elapses
                  ▼
┌─────────────────────────────────┐
│  src/generators/                │  ← Content generation only
│  StickerPayloadGenerator        │    Implements PayloadGenerator interface
│  (Phase 3: LlmRetortGenerator)  │    No knowledge of timing or sockets
└─────────────────┬───────────────┘
                  │ returns OutboundPayload
                  ▼
┌─────────────────────────────────┐
│  src/dispatcher.ts              │  ← Pure coordinator (~65 lines)
│  Dispatcher                     │    Wires guards → strategy → generator
│                                 │    Calls transport.send(), nothing else
└─────────────────────────────────┘
```

### 🚨 Golden Rules

1. **`@whiskeysockets/baileys` MUST ONLY be imported in `src/transport/`.**
   Guards, strategies, generators, and the dispatcher are fully transport-agnostic.

2. **`src/types.ts` is the single source of truth** for shared interfaces (`InboundMessage`,
   `OutboundPayload`, `PayloadGenerator`, `ReplyStrategy`). Do not redefine these elsewhere.

3. **Anti-overengineering:** This is a Modular Pipeline / Vertical Slice layout.
   Avoid DDD, CQRS, Aggregates, Command Buses, Repositories. Keep each slice
   single-purpose and independently headless-testable.

### 📁 Where Features Live

| Need to add… | Touch this folder |
| :--- | :--- |
| New timing/scheduling behavior | `src/strategies/` — implement `ReplyStrategy` |
| New content generator (LLM, image, text…) | `src/generators/` — implement `PayloadGenerator` |
| New message filter or guard | `src/guards/` — add a pure function |
| Baileys connection behavior, auth, egress | `src/transport/` — only here |
| Shared data shapes / contracts | `src/types.ts` |

---

## 🛡️ Critical Safety & Socket Guardrails

> [!CAUTION]
> **NEVER run `pnpm dev` or `pnpm start` autonomously.**
> Running the bot initiates a live WebSocket connection to WhatsApp servers. It may overwrite cryptographic keys in `auth_info_baileys/`, log out active devices, or send unsolicited automated replies. Only the human developer should execute the live bot.

- Do **not** commit `.env` or any `auth_info_baileys/` directories.
- Always maintain safe mock/dry-run fallbacks where possible.

---

## ⚡ Commands & Verification

- **Typecheck / Verification (Run before finishing any task):**
  ```bash
  pnpm exec tsc --noEmit
  ```
- **Install Dependencies:**
  ```bash
  pnpm install
  ```
- **Discovery Helper (Manual human supervision):**
  ```bash
  pnpm groups
  ```

---

## 🔄 Session Lifecycle & Handoff Protocol

1. **Cold Start:** At the beginning of any session, read `PROGRESS.md` to see the current focus, blockers, and next immediate tasks.
2. **Execution:** Keep changes modular, well-typed, and adhere to the single responsibility principle.
3. **Verification:** Run `pnpm exec tsc --noEmit` to confirm zero type regressions.
4. **Handoff:** Before finishing your response, update `PROGRESS.md` with:
   - What was accomplished.
   - Any new architectural quirks or blockers discovered.
   - The immediate next task for the next session.
