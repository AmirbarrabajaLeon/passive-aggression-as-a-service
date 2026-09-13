import type { InboundMessage, ReplyStrategy } from '../types.js';

export class QueueStrategy implements ReplyStrategy {
  private queue: InboundMessage[] = [];
  private processing = false;

  constructor(
    private jitter: () => number,
    private interPauseMs: () => number
  ) {}

  enqueue(msg: InboundMessage, fire: (msg: InboundMessage) => Promise<void>): void {
    this.queue.push(msg);
    console.log(`\x1b[34m[QUEUE]\x1b[0m Queued message (Queue size: ${this.queue.length})`);
    if (!this.processing) void this.drain(fire);
  }

  private async drain(fire: (msg: InboundMessage) => Promise<void>): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      const jitter = this.jitter();
      console.log(`\x1b[34m[QUEUE]\x1b[0m Human delay ${(jitter / 1000).toFixed(1)}s before replying...`);
      await new Promise<void>((r) => setTimeout(r, jitter));
      await fire(job);

      if (this.queue.length > 0) {
        await new Promise<void>((r) => setTimeout(r, this.interPauseMs()));
      }
    }

    this.processing = false;
  }
}
