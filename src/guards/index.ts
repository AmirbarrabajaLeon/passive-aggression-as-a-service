import type { InboundMessage } from '../types.js';
import type { Config } from '../config.js';

/** True if this message is a sticker — would cause an infinite reply loop. */
export function isStickerLoop(msg: InboundMessage): boolean {
  return Boolean(msg.raw.message?.stickerMessage);
}

/** True if the message predates bot startup (stale history sync). */
export function isHistoryMessage(msg: InboundMessage, botStartedAt: number): boolean {
  const rawTs = msg.raw.messageTimestamp;
  const msgTime = typeof rawTs === 'number' ? rawTs : Number(rawTs ?? 0);
  return msgTime > 0 && msgTime < botStartedAt - 5;
}

/** True if sender matches the configured target (primary JID, mapped alt, or username). */
export function isTargetMatch(msg: InboundMessage, config: Config): boolean {
  const rawTarget = config.targetSenderPhone.startsWith('@')
    ? config.targetSenderPhone.slice(1)
    : config.targetSenderPhone;
  const cleanTarget = rawTarget.split('@')[0].replace(/[:\s]/g, '').toLowerCase();
  const cleanSender = msg.senderJid.split('@')[0].split(':')[0].toLowerCase();
  const cleanAlt = msg.altSenderJid?.split('@')[0].split(':')[0].toLowerCase() ?? '';
  const cleanUser = msg.senderUsername?.toLowerCase().replace(/[@\s]/g, '') ?? '';

  return (
    cleanSender === cleanTarget ||
    (!!cleanAlt && cleanAlt === cleanTarget) ||
    (!!cleanUser && cleanUser === cleanTarget)
  );
}

/** True if the chat group matches the configured target group (case-insensitive). */
export function isTargetGroup(chatJid: string, config: Config): boolean {
  if (!config.targetGroupJid) return true;
  return chatJid.toLowerCase() === config.targetGroupJid.toLowerCase();
}

/** True if a self-sent message is explicitly allowed for testing. */
export function isSelfTestAllowed(msg: InboundMessage, config: Config): boolean {
  return msg.isFromMe && config.allowSelfTest;
}
