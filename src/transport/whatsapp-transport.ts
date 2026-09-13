import path from 'node:path';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
  type WAMessage,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { config } from '../config.js';
import type { InboundMessage, OutboundPayload } from '../types.js';

export class WhatsAppTransport {
  private sock: WASocket | null = null;
  private lidToPhone = new Map<string, string>();
  private phoneToLid = new Map<string, string>();
  private usernameToLid = new Map<string, string>();
  private lidToUsername = new Map<string, string>();

  constructor(
    private authFolder: string,
    private onMessage: (msg: InboundMessage) => Promise<void>,
    private botStartedAt: number
  ) {}

  public async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.resolve(process.cwd(), this.authFolder)
    );
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      defaultQueryTimeoutMs: 60000,
    });

    this.sock.ev.on('creds.update', saveCreds);

    // If a phone number is provided, use Pairing Code instead of QR (rock-solid on iOS)
    if (config.myPhoneNumber && !state.creds.registered) {
      setTimeout(async () => {
        try {
          const code = await this.sock?.requestPairingCode(config.myPhoneNumber);
          console.log('\n\x1b[32m====================================================\x1b[0m');
          console.log(`\x1b[1mYour WhatsApp Pairing Code:\x1b[0m  \x1b[1;33m${code}\x1b[0m`);
          console.log('\x1b[32m====================================================\x1b[0m');
          console.log('\x1b[1mHow to link on your iPhone:\x1b[0m');
          console.log('1. Open WhatsApp -> Settings -> Linked Devices -> Link a Device');
          console.log('2. Tap \x1b[36m"Link with phone number instead"\x1b[0m at the bottom');
          console.log(`3. Type the 8-digit code: \x1b[1;33m${code}\x1b[0m\n`);
        } catch (err) {
          console.error('\x1b[31m[PAIRING CODE ERROR]\x1b[0m Could not request pairing code:', err);
        }
      }, 3000);
    }

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Only print QR if user did NOT supply MY_PHONE_NUMBER for pairing code
      if (qr && !config.myPhoneNumber) {
        console.log('\n\x1b[33m==============================================\x1b[0m');
        console.log('\x1b[1mScan this QR Code with WhatsApp on your phone:\x1b[0m');
        console.log('\x1b[33m==============================================\x1b[0m\n');
        qrcode.generate(qr, { small: true });
        console.log('\n\x1b[90m(Open WhatsApp -> Linked Devices -> Link a Device)\x1b[0m\n');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
          ?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(
          `\x1b[31m[CONNECTION CLOSED]\x1b[0m Reason code: ${statusCode}. Reconnecting in 3s: ${shouldReconnect}`
        );

        if (shouldReconnect) {
          setTimeout(() => void this.start(), 3000);
        } else {
          console.log(
            '\x1b[31m[LOGGED OUT]\x1b[0m Session expired. Delete ./auth_info folder and restart.'
          );
        }
      } else if (connection === 'open') {
        console.log('\n\x1b[32m==============================================\x1b[0m');
        console.log('\x1b[32m[CONNECTED]\x1b[0m WhatsApp connection successfully established!');
        console.log('\x1b[32m==============================================\x1b[0m\n');

        // Preload participant phone <-> LID mappings in background
        void this.loadGroupMappings();
      }
    });

    this.sock.ev.on('messages.upsert', async (event) => {
      // Only process live incoming messages, NEVER history sync / appends
      if (event.type !== 'notify') return;

      for (const raw of event.messages) {
        if (!raw.message) continue;

        const chatJid = raw.key.remoteJid;
        if (!chatJid) continue;

        // In group chats, participant indicates the author; for self-messages, use bot's JID
        let senderJid = raw.key.participant || chatJid;
        if (raw.key.fromMe && this.sock?.user?.id) {
          senderJid = this.sock.user.id.replace(/:\d+@/, '@');
        }

        // Find alternative JID (resolves LID <-> Phone number)
        const cleanSenderId = senderJid.split('@')[0];
        let altSenderJid: string | undefined;
        if (senderJid.endsWith('@lid') && this.lidToPhone.has(cleanSenderId)) {
          altSenderJid = `${this.lidToPhone.get(cleanSenderId)}@s.whatsapp.net`;
        } else if (this.phoneToLid.has(cleanSenderId)) {
          altSenderJid = `${this.phoneToLid.get(cleanSenderId)}@lid`;
        }

        const msg: InboundMessage = {
          chatJid,
          senderJid,
          altSenderJid,
          senderUsername: this.lidToUsername.get(cleanSenderId),
          textPreview: this.extractText(raw),
          raw,
          isFromMe: Boolean(raw.key.fromMe),
        };

        await this.onMessage(msg);
      }
    });
  }

  /**
   * Egress: simulate typing presence, sanitize quoted context, send via Baileys.
   * The Dispatcher calls this — it never holds a WASocket reference itself.
   */
  public async send(
    chatJid: string,
    payload: OutboundPayload,
    raw: WAMessage,
    textPreview: string
  ): Promise<void> {
    if (!this.sock) return;

    // Simulate human presence (typing indicator)
    if (config.simulateTyping) {
      try {
        await this.sock.sendPresenceUpdate('composing', chatJid);
        const typingDuration = Math.floor(Math.random() * 1000) + 1000;
        await new Promise<void>((r) => setTimeout(r, typingDuration));
        await this.sock.sendPresenceUpdate('paused', chatJid);
      } catch {
        // Presence errors shouldn't prevent sending sticker
      }
    }

    // Build a clean, sanitized quoted reference to prevent WhatsApp client-side
    // media drop when quoting images/videos containing raw encrypted media keys.
    const sanitizedQuoted = {
      key: raw.key,
      message: { conversation: textPreview },
    };

    if (payload.sticker) {
      console.log(`\x1b[32m[SENDING]\x1b[0m Quoting message "${textPreview}" with sticker...`);
      try {
        const sent = await this.sock.sendMessage(
          chatJid,
          { sticker: payload.sticker },
          { quoted: sanitizedQuoted as unknown as WAMessage }
        );
        console.log(
          `\x1b[32m[SUCCESS]\x1b[0m Sticker sent successfully! (ID: ${sent?.key?.id ?? 'dispatched'}) Target annoyed.`
        );
      } catch (quoteErr) {
        console.warn(
          `\x1b[33m[WARN]\x1b[0m Quoted send failed, falling back to standalone sticker:`,
          quoteErr
        );
        const fallback = await this.sock.sendMessage(chatJid, { sticker: payload.sticker });
        console.log(
          `\x1b[32m[SUCCESS]\x1b[0m Standalone sticker sent as fallback! (ID: ${fallback?.key?.id ?? 'dispatched'})`
        );
      }
    }
  }

  private extractText(msg: WAMessage): string {
    const m = msg.message;
    if (!m) return '';
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return `[Image: ${m.imageMessage.caption}]`;
    if (m.videoMessage?.caption) return `[Video: ${m.videoMessage.caption}]`;
    if (m.stickerMessage) return '[Sticker]';
    if (m.audioMessage) return '[Audio Note]';
    if (m.reactionMessage) return `[Reaction: ${m.reactionMessage.text}]`;
    return '[Message]';
  }

  private async loadGroupMappings(): Promise<void> {
    try {
      if (!this.sock) return;
      const groups = await this.sock.groupFetchAllParticipating();
      for (const g of Object.values(groups)) {
        for (const p of g.participants) {
          const cleanLid = p.id.split('@')[0];
          if (p.phoneNumber) {
            const cleanPhone = p.phoneNumber.split('@')[0];
            this.lidToPhone.set(cleanLid, cleanPhone);
            this.phoneToLid.set(cleanPhone, cleanLid);
          }
          const username = (p as { username?: string }).username;
          if (username) {
            const cleanUser = username.toLowerCase().replace('@', '');
            this.usernameToLid.set(cleanUser, cleanLid);
            this.lidToUsername.set(cleanLid, cleanUser);
          }
        }
      }
    } catch {
      // Non-critical background mapping
    }
  }
}
