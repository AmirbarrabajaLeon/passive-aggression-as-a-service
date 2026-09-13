import type { Config } from '../config.js';
import type { ReplyStrategy } from '../types.js';
import { DebounceStrategy } from './debounce.js';
import { QueueStrategy } from './queue.js';
import { CooldownStrategy } from './cooldown.js';

function makeJitter(min: number, max: number): () => number {
  return () => Math.floor(Math.random() * (max - min + 1)) + min;
}

export function buildStrategy(config: Config): ReplyStrategy {
  const jitter = makeJitter(config.jitterMinMs, config.jitterMaxMs);
  switch (config.replyMode) {
    case 'queue':
      return new QueueStrategy(jitter, makeJitter(2000, 4000));
    case 'cooldown':
      return new CooldownStrategy(config.cooldownMs, jitter);
    case 'debounce':
    default:
      return new DebounceStrategy(config.debounceWaitMs, jitter);
  }
}
