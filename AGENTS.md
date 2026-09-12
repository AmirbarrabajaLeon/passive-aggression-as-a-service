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
