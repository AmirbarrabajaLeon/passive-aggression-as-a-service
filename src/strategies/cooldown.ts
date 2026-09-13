import type { InboundMessage, ReplyStrategy } from '../types.js';

export class CooldownStrategy implements ReplyStrategy {
  private lastFiredAt = 0;

  constructor(
    private cooldownMs: number,
    private jitter: () => number
  ) {}

  enqueue(msg: InboundMessage, fire: (msg: InboundMessage) => Promise<void>): void {
    const now = Date.now();
    const elapsed = now - this.lastFiredAt;

    if (elapsed < this.cooldownMs) {
      const remainingSecs = Math.ceil((this.cooldownMs - elapsed) / 1000);
      console.log(
        `\x1b[33m[COOLDOWN]\x1b[0m Cooldown active (${remainingSecs}s remaining). Skipping message.`
      );
      return;
    }

    this.lastFiredAt = Date.now();
    const jitter = this.jitter();
    console.log(
      `\x1b[33m[COOLDOWN]\x1b[0m Cooldown passed. Waiting ${(jitter / 1000).toFixed(1)}s before sending sticker...`
    );
    void new Promise<void>((r) => setTimeout(r, jitter)).then(() => fire(msg));
  }
}
