import { config } from './config.js';
import type { InboundMessage } from './types.js';
import {
  isStickerLoop,
  isHistoryMessage,
  isTargetGroup,
  isTargetMatch,
  isSelfTestAllowed,
} from './guards/index.js';
import { buildStrategy } from './strategies/index.js';
import { CompositePayloadGenerator } from './generators/index.js';
import type { WhatsAppTransport } from './transport/index.js';

export class Dispatcher {
  private readonly strategy = buildStrategy(config);
  private readonly generator = new CompositePayloadGenerator();

  constructor(
    private transport: WhatsAppTransport,
    private botStartedAt: number
  ) {}

  async handle(msg: InboundMessage): Promise<void> {
    // Discovery logging (runs before any guard drops the message)
    if (config.discoveryMode) {
      const isGroup = msg.chatJid.endsWith('@g.us');
      const senderNumber = msg.senderJid.split('@')[0];
      const altInfo = msg.altSenderJid
        ? ` [Mapped to: +${msg.altSenderJid.split('@')[0]}]`
        : '';
      const userTag = msg.senderUsername ? ` (@${msg.senderUsername})` : '';
      const chatLabel = isGroup ? `Group (${msg.chatJid})` : `Direct Chat (${msg.chatJid})`;
      console.log(
        `\x1b[36m[DISCOVERY]\x1b[0m ${chatLabel} | Sender: \x1b[33m+${senderNumber}\x1b[0m${userTag} (${msg.senderJid})${altInfo} | Message: "${msg.textPreview}"`
      );
    }

    // --- Guard Pipeline ---
    if (isStickerLoop(msg)) return;
    if (isHistoryMessage(msg, this.botStartedAt)) return;

    if (msg.isFromMe) {
      if (!isSelfTestAllowed(msg, config)) return;
      // If a specific group is set, only trigger inside that group or in direct chats
      if (
        config.targetGroupJid &&
        msg.chatJid.endsWith('@g.us') &&
        msg.chatJid !== config.targetGroupJid
      )
        return;
      console.log(
        `\x1b[32m[SELF-TEST TRIGGERED]\x1b[0m Triggered on your own message: "${msg.textPreview}"`
      );
    } else {
      if (!config.targetSenderPhone) return; // discovery-only mode: log but don't reply
      if (!isTargetGroup(msg.chatJid, config)) return;
      if (!isTargetMatch(msg, config)) return;
      console.log(
        `\x1b[32m[TARGET DETECTED]\x1b[0m Target friend spoke in chat: "${msg.textPreview}"`
      );
    }

    // --- Strategy Enqueue ---
    this.strategy.enqueue(msg, async (m) => {
      const payload = await this.generator.generate(m);
      if (payload) await this.transport.send(m.chatJid, payload, m.raw, m.textPreview);
    });
  }
}
