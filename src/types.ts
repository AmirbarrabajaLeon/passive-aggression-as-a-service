import type { WAMessage } from '@whiskeysockets/baileys';

/** Normalized message handed off from transport to the pipeline. */
export interface InboundMessage {
  chatJid: string;
  senderJid: string;
  altSenderJid?: string;
  senderUsername?: string;
  textPreview: string;
  raw: WAMessage; // retained for sanitized-quote building in egress
  isFromMe: boolean;
}

/** What a generator produces for the egress layer to send. */
export interface OutboundPayload {
  sticker?: Buffer;
  text?: string; // Phase 3 hook — unused for now
}

/** Contract for any content generator (sticker, LLM, composite…). */
export interface PayloadGenerator {
  generate(msg: InboundMessage): Promise<OutboundPayload | null>;
}

/** Contract for a timing/scheduling strategy. */
export interface ReplyStrategy {
  enqueue(msg: InboundMessage, fire: (msg: InboundMessage) => Promise<void>): void;
}
