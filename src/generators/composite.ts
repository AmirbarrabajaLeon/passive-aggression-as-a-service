import { config } from '../config.js';
import type { InboundMessage, OutboundPayload, PayloadGenerator } from '../types.js';
import { LlmRetortGenerator } from './llm.js';
import { StickerPayloadGenerator } from './sticker.js';

/**
 * Orchestrates text + sticker delivery based on REPLY_FORMAT:
 *   - "sticker" → sticker only (no LLM call, legacy Phase 2 behaviour)
 *   - "text"    → LLM retort only, no sticker
 *   - "combo"   → LLM + sticker run in parallel; merged into one OutboundPayload
 *
 * If the LLM generator returns null (no API key, timeout, error), the sticker
 * is sent on its own so the target is never left in peace.
 */
export class CompositePayloadGenerator implements PayloadGenerator {
  private readonly llm = new LlmRetortGenerator();
  private readonly sticker = new StickerPayloadGenerator();

  async generate(msg: InboundMessage): Promise<OutboundPayload | null> {
    const format = config.replyFormat;

    if (format === 'sticker') {
      // Legacy mode: sticker only, skip LLM entirely.
      return this.sticker.generate(msg);
    }

    if (format === 'text') {
      // Text-only: pure LLM retort, no sticker.
      return this.llm.generate(msg);
    }

    // 'combo' (default): run both generators in parallel, then merge.
    const [llmPayload, stickerPayload] = await Promise.all([
      this.llm.generate(msg),
      this.sticker.generate(msg),
    ]);

    if (!llmPayload && !stickerPayload) return null;

    return {
      text: llmPayload?.text,
      sticker: stickerPayload?.sticker,
    };
  }
}
