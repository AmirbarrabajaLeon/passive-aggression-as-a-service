import type { InboundMessage, ReplyStrategy } from '../types.js';

export class DebounceStrategy implements ReplyStrategy {
  private timer: NodeJS.Timeout | null = null;
  private latestMsg: InboundMessage | null = null;

  constructor(private waitMs: number, private jitter: () => number) {}

  enqueue(msg: InboundMessage, fire: (msg: InboundMessage) => Promise<void>): void {
    if (this.timer) {
      clearTimeout(this.timer);
      console.log(
        `\x1b[35m[DEBOUNCE]\x1b[0m Target still typing/sending. Resetting timer for new message: "${msg.textPreview}"`
      );
    }

    this.latestMsg = msg;
    const totalWait = this.waitMs + this.jitter();

    console.log(
      `\x1b[35m[DEBOUNCE]\x1b[0m Waiting ${(totalWait / 1000).toFixed(1)}s of silence before replying...`
    );

    this.timer = setTimeout(async () => {
      if (this.latestMsg) {
        const toFire = this.latestMsg;
        this.latestMsg = null;
        this.timer = null;
        await fire(toFire);
      }
    }, totalWait);
  }
}
