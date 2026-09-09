import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

export type ReplyMode = 'debounce' | 'queue' | 'cooldown';

export interface Config {
  targetGroupJid: string;
  targetSenderPhone: string;
  replyMode: ReplyMode;
  debounceWaitMs: number;
  cooldownMs: number;
  jitterMinMs: number;
  jitterMaxMs: number;
  simulateTyping: boolean;
  stickerPath: string;
  discoveryMode: boolean;
  allowSelfTest: boolean;
  myPhoneNumber: string;
}

function normalizeJid(id: string, defaultDomain: 's.whatsapp.net' | 'g.us'): string {
  const clean = id.trim().replace(/[+\s-]/g, '');
  if (!clean) return '';
  if (clean.includes('@')) return clean;
  return `${clean}@${defaultDomain}`;
}

export const config: Config = {
  targetGroupJid: normalizeJid(process.env.TARGET_GROUP_JID || '', 'g.us'),
  targetSenderPhone: normalizeJid(process.env.TARGET_SENDER_PHONE || '', 's.whatsapp.net'),
  replyMode: (process.env.REPLY_MODE as ReplyMode) || 'debounce',
  debounceWaitMs: Number.parseInt(process.env.DEBOUNCE_WAIT_MS || '3500', 10),
  cooldownMs: Number.parseInt(process.env.COOLDOWN_MS || '30000', 10),
  jitterMinMs: Number.parseInt(process.env.JITTER_MIN_MS || '1500', 10),
  jitterMaxMs: Number.parseInt(process.env.JITTER_MAX_MS || '3500', 10),
  simulateTyping: process.env.SIMULATE_TYPING !== 'false',
  stickerPath: path.resolve(process.cwd(), process.env.STICKER_PATH || './lion.webp'),
  discoveryMode: process.env.DISCOVERY_MODE !== 'false',
  allowSelfTest: process.env.ALLOW_SELF_TEST === 'true',
  myPhoneNumber: (process.env.MY_PHONE_NUMBER || '').trim().replace(/[+\s-]/g, ''),
};
