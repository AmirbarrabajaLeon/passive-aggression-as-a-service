# WhatsApp Auto-Sticker Bot 🦁🎭

An automated WhatsApp response bot built with `@whiskeysockets/baileys` and Node.js. It automatically replies to a target contact in a specific group chat by quoting their message with a sticker drawn from a dynamic sticker pool (`./stickers/`), featuring humanized delay jitter, shuffle-bag non-repetition rotation, and multiple anti-spam / trolling strategies.

---

## 🚀 Features

- **Direct WebSocket Protocol**: Built using Baileys (no heavy Chromium/browser overhead).
- **Dynamic Multi-Sticker Pool**:
  - Drop any `.webp` sticker into `./stickers/` and the bot picks it up dynamically on the next reply—no server restart required!
  - **Full Animated WebP Support**: Supports both static and animated stickers natively.
  - **Fisher-Yates Shuffle Bag**: Deals stickers like a deck of cards, guaranteeing **zero back-to-back repeats** across replies.
  - **Self-Healing Rotation Cascade**: Validates file size (<= 1MB) and `RIFF....WEBP` magic headers, automatically cascading to the next sticker if a file is invalid or corrupt.
- **Humanized Delivery**:
  - **Random Jitter**: Never sends at fixed bot intervals; adds dynamic millisecond delays.
  - **Presence Simulation**: Emits a `composing...` (typing) indicator for 1–2 seconds prior to replying.
- **3 Anti-Spam / Trolling Strategies** (switchable via `.env`):
  1. **`debounce`** *(Default & Recommended)*: Waits until the target stops typing/sending (e.g. 3.5s of silence), then quotes their **very last** message with a sticker.
  2. **`queue`**: Queues every single message and replies one-by-one with randomized human pauses in between.
  3. **`cooldown`**: Replies to their initial message, then ignores subsequent messages for a set cooldown period (e.g. 30 seconds).
- **Flexible Device Pairing**: Link via standard terminal QR code or direct WhatsApp Pairing Code (recommended for iPhone).
- **Built-in Discovery Mode & Groups Inspector**: Inspect group JIDs, member numbers, and privacy LIDs instantly.

---

## 🏗️ Architecture

The bot is built as a clean **Modular Pipeline** — each concern lives in its own slice with a single responsibility. This makes it easy to add new features (LLM retorts, Web UI) without touching the core plumbing.

```
src/
├── types.ts               ← Shared contracts (InboundMessage, PayloadGenerator…)
├── config.ts              ← Env-var configuration
├── sticker-pool.ts        ← Fisher-Yates shuffle bag + WebP validation
│
├── transport/             ← ALL Baileys socket concerns
│   └── whatsapp-transport.ts   auth, QR/pairing, LID mapping, send()
│
├── guards/                ← Pure message filter functions
│   └── index.ts                isStickerLoop, isTargetMatch, isHistoryMessage…
│
├── strategies/            ← Timing / scheduling strategies
│   ├── debounce.ts             wait for silence, reply to last message
│   ├── queue.ts                sequential replies with human pacing
│   └── cooldown.ts             fire once, ignore for N seconds
│
├── generators/            ← Content generation (what to send)
│   └── sticker.ts              draws from StickerPool
│
├── dispatcher.ts          ← Coordinator: guards → strategy → generator → send
└── index.ts               ← Entry point & startup banner
```

**Message lifecycle:** A raw Baileys event is normalized by `WhatsAppTransport` into an `InboundMessage`, passed through pure guard functions to filter out noise, handed to the active timing strategy (`debounce` / `queue` / `cooldown`), which fires a payload generator when ready, and finally calls `transport.send()` to deliver the quoted sticker reply.

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Settings
Open `.env` (or copy from `.env.example`):

```env
# Target WhatsApp Group JID (e.g. 120363012345678901@g.us)
# Leave blank initially if you want Discovery Mode to find it for you!
TARGET_GROUP_JID=

# Target friend's phone number, privacy LID, or username (e.g. 15551234567 or Alex_99)
TARGET_SENDER_PHONE=

# Reply Mode: "debounce" | "queue" | "cooldown"
REPLY_MODE=debounce

# Time to wait after his last message before replying (ms)
DEBOUNCE_WAIT_MS=3500

# Random human jitter range (ms)
JITTER_MIN_MS=1500
JITTER_MAX_MS=3500

# Typing indicator simulation
SIMULATE_TYPING=true

# Sticker pool directory relative to project root
STICKERS_DIR=./stickers

# Legacy/override single sticker file relative to project root (optional)
STICKER_PATH=./stickers/lion.webp

# Discovery logging
DISCOVERY_MODE=true

# Self-Test Mode: test the bot using your own messages
ALLOW_SELF_TEST=true

# (Optional for iPhone): Link via 8-digit Pairing Code instead of QR
MY_PHONE_NUMBER=
```

### 3. Add Your Stickers
Place any `.webp` stickers (static or animated) into the `./stickers/` folder. The bot comes with sample stickers ready to go out of the box!

### 4. Run the Bot
```bash
pnpm dev
```

1. A QR code (or pairing code) will display in your terminal.
2. Open WhatsApp on your phone $\rightarrow$ **Settings / Menu** $\rightarrow$ **Linked Devices** $\rightarrow$ **Link a Device**.
3. Scan the QR code or enter the pairing code. Your session is securely stored in `./auth_info_baileys/` (you won't need to re-link on future launches).

---

## 🧪 Testing With Yourself First

You can test the bot using your own WhatsApp account before targeting your friend:

1. Ensure `ALLOW_SELF_TEST=true` in `.env`.
2. Start the bot:
   ```bash
   pnpm dev
   ```
3. Link your phone via QR or pairing code.
4. Go to your own **"Message Yourself"** chat in WhatsApp (or a private test group).
5. Type and send a message (e.g., *"testing debounce"*).
6. **Watch the magic:**
   - The terminal will log: `[SELF-TEST TRIGGERED]`
   - It counts down the debounce duration + random jitter.
   - It briefly displays "typing..." in WhatsApp.
   - It quotes your message with a randomly selected sticker from `./stickers/`!
   - *(Incoming stickers are automatically ignored, so it will never trigger an infinite loop).*
7. When you are ready for your friend:
   - Set `ALLOW_SELF_TEST=false` in `.env`.
   - Set `TARGET_GROUP_JID` and `TARGET_SENDER_PHONE` to his details.

---

## 🔍 How to Find Your Friend's ID & Group ID

You don't need to wait for anyone to talk! Use the built-in groups inspector:

### Method 1: Instant Group & Member Inspector (Fastest)
Run the `groups` command:
```bash
# List all your WhatsApp groups:
pnpm groups

# Or search for a specific group name:
pnpm groups "Weekend"
```

The terminal will instantly print:
```text
====================================================
Group:    Weekend Trip 🍕🏕️
Group ID: 120363012345678901@g.us
Members (6):
   - ID: 247390000000000 (@Alex_99)
   - +15551234567 (LID: 122170000000000) (admin)
   - +15559876543 (LID: 242220000000000)
   ...
====================================================
```

### Flexible Target Identifiers:
In your `.env`, `TARGET_SENDER_PHONE` accepts **any** of the following:
1. **Privacy LID** (recommended for contacts with hidden numbers): `247390000000000`
2. **WhatsApp Username**: `Alex_99` or `@Alex_99`
3. **Real Phone Number**: `15551234567` (country code + number, digits only)

---

### Method 2: Live Discovery Mode
If you leave `TARGET_GROUP_JID` and `TARGET_SENDER_PHONE` blank in `.env` and run `pnpm dev`, whenever any message arrives in WhatsApp, your terminal will print:
```text
[DISCOVERY] Group (120363012345678901@g.us) | Sender: +15551234567 (@username) | Message: "Hello"
```
You can copy those details directly into `.env` and restart the bot.



