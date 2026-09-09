# WhatsApp Auto-Sticker Bot 🦁

An automated WhatsApp response bot built with `@whiskeysockets/baileys` and Node.js. It automatically replies to a target contact in a specific group chat by quoting their message with a sticker (`lion.webp`), featuring humanized delay jitter and multiple anti-spam / trolling strategies.

---

## 🚀 Features

- **Direct WebSocket Protocol**: Built using Baileys (no heavy Chromium/browser overhead).
- **Humanized Delivery**:
  - **Random Jitter**: Never sends at fixed bot intervals; adds dynamic millisecond delays.
  - **Presence Simulation**: Emits a `composing...` (typing) indicator for 1–2 seconds prior to replying.
- **3 Anti-Spam / Trolling Strategies** (switchable via `.env`):
  1. **`debounce`** *(Default & Recommended)*: Waits until the target stops typing/sending (e.g. 3.5s of silence), then quotes their **very last** message with the lion sticker.
  2. **`queue`**: Queues every single message and replies one-by-one with randomized human pauses in between.
  3. **`cooldown`**: Replies to their initial message, then ignores subsequent messages for a set cooldown period (e.g. 30 seconds).
- **Built-in Discovery Mode**: Automatically logs incoming group IDs and phone numbers in the terminal so you can easily copy and paste them into your `.env`.

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

# Target friend's phone number (Digits only, e.g. 15551234567)
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

# Path to the sticker file
STICKER_PATH=./lion.webp

# Discovery logging
DISCOVERY_MODE=true
```

### 3. Run the Bot
```bash
pnpm dev
```

1. A QR code will display in your terminal.
2. Open WhatsApp on your phone $\rightarrow$ **Settings / Menu** $\rightarrow$ **Linked Devices** $\rightarrow$ **Link a Device**.
3. Scan the QR code. Your session is securely stored locally in the `./auth_info` folder (you won't need to re-scan on future launches).

---

## 🧪 Testing With Yourself First

You can test the bot using your own WhatsApp account before targeting your friend:

1. Ensure `ALLOW_SELF_TEST=true` in `.env`.
2. Start the bot:
   ```bash
   pnpm dev
   ```
3. Scan the QR code with your phone.
4. Go to your own **"Message Yourself"** chat in WhatsApp (or a private test group).
5. Type and send a message (e.g., *"testing debounce"*).
6. **Watch the magic:**
   - The terminal will log: `[SELF-TEST TRIGGERED]`
   - It counts down the debounce duration + random jitter.
   - It briefly displays "typing..." in WhatsApp.
   - It quotes your message with `lion.webp`!
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



