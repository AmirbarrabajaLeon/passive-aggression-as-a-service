import type { InboundMessage, OutboundPayload, PayloadGenerator } from '../types.js';
import { stickerPool } from '../sticker-pool.js';

export class StickerPayloadGenerator implements PayloadGenerator {
  async generate(_msg: InboundMessage): Promise<OutboundPayload | null> {
    const sticker = stickerPool.drawSticker();
    if (!sticker) return null;
    return { sticker: sticker.buffer };
  }
}
