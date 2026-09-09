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
import { config } from './config.js';
import { MessageDispatcher } from './dispatcher.js';

export class WhatsAppClient {
  private sock: WASocket | null = null;
  private dispatcher: MessageDispatcher | null = null;
  private authFolder: string;
  private startedAt = Math.floor(Date.now() / 1000);
  private lidToPhone = new Map<string, string>();
  private phoneToLid = new Map<string, string>();
  private usernameToLid = new Map<string, string>();
  private lidToUsername = new Map<string, string>();

  constructor(authFolder = './auth_info') {
    this.authFolder = path.resolve(process.cwd(), authFolder);
  }

  public async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'silent' });

    this.sock = makeWASocket({
      version,
      auth: state,
      logger,
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      defaultQueryTimeoutMs: 60000,
    });

    if (!this.dispatcher) {
      this.dispatcher = new MessageDispatcher(this.sock);
    } else {
      this.dispatcher.updateSocket(this.sock);
    }

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
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`\x1b[31m[CONNECTION CLOSED]\x1b[0m Reason code: ${statusCode}. Reconnecting in 3s: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(() => void this.start(), 3000);
        } else {
          console.log('\x1b[31m[LOGGED OUT]\x1b[0m Session expired. Delete ./auth_info folder and restart.');
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
      if (!this.dispatcher) return;

      // Only process live incoming messages, NEVER history sync / appends
      if (event.type !== 'notify') return;

      for (const msg of event.messages) {
        if (!msg.message) continue;

        // CRITICAL: Never react to stickers (prevents infinite self-loops)
        if (msg.message.stickerMessage) continue;

        // Ignore historical/backlogged messages sent before bot started
        const rawTimestamp = msg.messageTimestamp;
        const msgTime = typeof rawTimestamp === 'number' ? rawTimestamp : Number(rawTimestamp || 0);
        if (msgTime > 0 && msgTime < this.startedAt - 5) {
          continue;
        }

        // Skip our own messages unless testing mode is explicitly enabled
        if (msg.key.fromMe && !config.allowSelfTest) {
          continue;
        }

        const chatJid = msg.key.remoteJid;
        if (!chatJid) continue;

        // In group chats, participant indicates the author; for self-messages, use bot's JID
        let senderJid = msg.key.participant || chatJid;
        if (msg.key.fromMe && this.sock?.user?.id) {
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

        const senderUsername = this.lidToUsername.get(cleanSenderId);

        // Extract a readable text snippet for logging
        const textPreview = this.extractMessageText(msg);

        await this.dispatcher.handleIncoming(chatJid, senderJid, msg, textPreview, altSenderJid, senderUsername);
      }
    });
  }

  private extractMessageText(msg: WAMessage): string {
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
