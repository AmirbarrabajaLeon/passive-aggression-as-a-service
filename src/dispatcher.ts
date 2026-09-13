import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import { config } from './config.js';
import { stickerPool } from './sticker-pool.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomJitter(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface QueuedJob {
  chatJid: string;
  message: WAMessage;
  textPreview: string;
}

export class MessageDispatcher {
  private sock: WASocket;
  private debounceTimer: NodeJS.Timeout | null = null;
  private latestDebouncedJob: QueuedJob | null = null;
  private lastRepliedAt = 0;
  private queue: QueuedJob[] = [];
  private isProcessingQueue = false;

  constructor(sock: WASocket) {
    this.sock = sock;
  }

  public updateSocket(sock: WASocket): void {
    this.sock = sock;
  }

  public async handleIncoming(
    chatJid: string,
    senderJid: string,
    message: WAMessage,
    textPreview: string,
    altSenderJid?: string,
    senderUsername?: string
  ): Promise<void> {
    // Discovery logging
    if (config.discoveryMode) {
      const isGroup = chatJid.endsWith('@g.us');
      const senderNumber = senderJid.split('@')[0];
      const altInfo = altSenderJid ? ` [Mapped to: +${altSenderJid.split('@')[0]}]` : '';
      const userTag = senderUsername ? ` (@${senderUsername})` : '';
      const chatLabel = isGroup ? `Group (${chatJid})` : `Direct Chat (${chatJid})`;
      console.log(`\x1b[36m[DISCOVERY]\x1b[0m ${chatLabel} | Sender: \x1b[33m+${senderNumber}\x1b[0m${userTag} (${senderJid})${altInfo} | Message: "${textPreview}"`);
    }

    // Self-test handling
    const isSelf = Boolean(message.key.fromMe);
    if (isSelf && config.allowSelfTest) {
      // If a specific group is set, only trigger inside that group or in direct chats (e.g. Note to Self)
      if (config.targetGroupJid && chatJid.endsWith('@g.us') && chatJid !== config.targetGroupJid) {
        return;
      }
      console.log(`\x1b[32m[SELF-TEST TRIGGERED]\x1b[0m Triggered on your own message: "${textPreview}"`);
    } else {
      // Check if target filters are configured
      if (!config.targetSenderPhone) {
        // If no target phone is set yet, we only discover
        return;
      }

      // Filter by group if configured
      if (config.targetGroupJid && chatJid.toLowerCase() !== config.targetGroupJid.toLowerCase()) {
        return;
      }

      // Filter by sender (checks primary JID, alternative mapped Phone/LID, or username)
      const rawTarget = config.targetSenderPhone.startsWith('@')
        ? config.targetSenderPhone.slice(1)
        : config.targetSenderPhone;
      const cleanTarget = rawTarget.split('@')[0].replace(/[:\s]/g, '').toLowerCase();
      const cleanSender = senderJid.split('@')[0].split(':')[0].toLowerCase();
      const cleanAlt = altSenderJid ? altSenderJid.split('@')[0].split(':')[0].toLowerCase() : '';
      const cleanUser = senderUsername ? senderUsername.toLowerCase().replace(/[@\s]/g, '') : '';

      const isMatch =
        cleanSender === cleanTarget ||
        (Boolean(cleanAlt) && cleanAlt === cleanTarget) ||
        (Boolean(cleanUser) && cleanUser === cleanTarget);

      if (!isMatch) {
        return;
      }

      console.log(`\x1b[32m[TARGET DETECTED]\x1b[0m Target friend spoke in chat: "${textPreview}"`);
    }

    const job: QueuedJob = { chatJid, message, textPreview };

    switch (config.replyMode) {
      case 'debounce':
        this.handleDebounce(job);
        break;
      case 'queue':
        this.handleQueue(job);
        break;
      case 'cooldown':
        await this.handleCooldown(job);
        break;
      default:
        this.handleDebounce(job);
        break;
    }
  }

  // =========================================================================
  // Strategy 1: Debounce (Wait until he stops typing, then reply to last message)
  // =========================================================================
  private handleDebounce(job: QueuedJob): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      console.log(`\x1b[35m[DEBOUNCE]\x1b[0m Target still typing/sending. Resetting timer for new message: "${job.textPreview}"`);
    }

    this.latestDebouncedJob = job;
    const jitter = getRandomJitter(config.jitterMinMs, config.jitterMaxMs);
    const totalWait = config.debounceWaitMs + jitter;

    console.log(`\x1b[35m[DEBOUNCE]\x1b[0m Waiting ${(totalWait / 1000).toFixed(1)}s of silence before replying...`);

    this.debounceTimer = setTimeout(async () => {
      if (this.latestDebouncedJob) {
        const toReply = this.latestDebouncedJob;
        this.latestDebouncedJob = null;
        this.debounceTimer = null;
        await this.sendStickerReply(toReply);
      }
    }, totalWait);
  }

  // =========================================================================
  // Strategy 2: Queue (Sequential replies with human-paced gaps)
  // =========================================================================
  private handleQueue(job: QueuedJob): void {
    this.queue.push(job);
    console.log(`\x1b[34m[QUEUE]\x1b[0m Queued message (Queue size: ${this.queue.length})`);

    if (!this.isProcessingQueue) {
      void this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      const jitter = getRandomJitter(config.jitterMinMs, config.jitterMaxMs);
      console.log(`\x1b[34m[QUEUE]\x1b[0m Human delay ${(jitter / 1000).toFixed(1)}s before replying...`);
      await delay(jitter);

      await this.sendStickerReply(job);

      // Brief inter-message pause if more items remain in queue
      if (this.queue.length > 0) {
        const pause = getRandomJitter(2000, 4000);
        await delay(pause);
      }
    }

    this.isProcessingQueue = false;
  }

  // =========================================================================
  // Strategy 3: Cooldown (Reply immediately, then ignore for X seconds)
  // =========================================================================
  private async handleCooldown(job: QueuedJob): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRepliedAt;

    if (elapsed < config.cooldownMs) {
      const remainingSecs = Math.ceil((config.cooldownMs - elapsed) / 1000);
      console.log(`\x1b[33m[COOLDOWN]\x1b[0m Cooldown active (${remainingSecs}s remaining). Skipping message.`);
      return;
    }

    this.lastRepliedAt = now;
    const jitter = getRandomJitter(config.jitterMinMs, config.jitterMaxMs);
    console.log(`\x1b[33m[COOLDOWN]\x1b[0m Cooldown passed. Waiting ${(jitter / 1000).toFixed(1)}s before sending sticker...`);
    await delay(jitter);

    await this.sendStickerReply(job);
  }

  // =========================================================================
  // Sender Engine: Presence simulation + Quoted Sticker Delivery
  // =========================================================================
  private async sendStickerReply(job: QueuedJob): Promise<void> {
    try {
      const sticker = stickerPool.drawSticker();
      if (!sticker) {
        // Pool is empty or all candidates failed validation. Error already logged by stickerPool.
        return;
      }

      // Simulate human presence (typing indicator)
      if (config.simulateTyping) {
        try {
          await this.sock.sendPresenceUpdate('composing', job.chatJid);
          const typingDuration = getRandomJitter(1000, 2000);
          await delay(typingDuration);
          await this.sock.sendPresenceUpdate('paused', job.chatJid);
        } catch {
          // Presence errors shouldn't prevent sending sticker
        }
      }

      console.log(`\x1b[32m[SENDING]\x1b[0m Quoting message "${job.textPreview}" with sticker "${sticker.filename}"...`);

      // Build a clean, sanitized quoted reference to prevent WhatsApp client-side
      // media drop when quoting images/videos containing raw encrypted media keys.
      const sanitizedQuoted = {
        key: job.message.key,
        message: {
          conversation: job.textPreview,
        },
      };

      try {
        const sent = await this.sock.sendMessage(
          job.chatJid,
          {
            sticker: sticker.buffer,
          },
          {
            quoted: sanitizedQuoted as unknown as WAMessage,
          }
        );

        console.log(`\x1b[32m[SUCCESS]\x1b[0m Sticker "${sticker.filename}" sent successfully! (ID: ${sent?.key?.id || 'dispatched'}) Target annoyed.`);
      } catch (quoteErr) {
        console.warn(`\x1b[33m[WARN]\x1b[0m Quoted send failed, falling back to standalone sticker:`, quoteErr);
        const fallback = await this.sock.sendMessage(job.chatJid, { sticker: sticker.buffer });
        console.log(`\x1b[32m[SUCCESS]\x1b[0m Standalone sticker "${sticker.filename}" sent as fallback! (ID: ${fallback?.key?.id || 'dispatched'})`);
      }
    } catch (error) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Failed to send sticker:`, error);
    }
  }
}
