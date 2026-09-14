import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { config } from '../config.js';
import type { InboundMessage, OutboundPayload, PayloadGenerator } from '../types.js';

const SYSTEM_PROMPT_PATH = path.resolve(process.cwd(), 'prompts/system.md');
const LLM_TIMEOUT_MS = 8000;
const MAX_TOKENS = 35;

export class LlmRetortGenerator implements PayloadGenerator {
  private readonly client: OpenAI;
  private readonly systemPromptTemplate: string;

  constructor() {
    if (!config.llmApiKey) {
      console.warn('\x1b[33m[LLM]\x1b[0m LLM_API_KEY is not set. LLM retorts will be disabled.');
    }

    this.client = new OpenAI({
      apiKey: config.llmApiKey || 'sk-noop',
      baseURL: config.llmBaseUrl,
    });

    // Read and cache the prompt template at construction time (zero per-request I/O).
    this.systemPromptTemplate = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');
  }

  async generate(msg: InboundMessage): Promise<OutboundPayload | null> {
    if (!config.llmApiKey) return null;

    try {
      const result = await Promise.race<OpenAI.Chat.ChatCompletion>([
        this.client.chat.completions.create({
          model: config.llmModel,
          messages: [
            { role: 'system', content: this.systemPromptTemplate },
            { role: 'user', content: msg.textPreview },
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.8,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM timeout')), LLM_TIMEOUT_MS)
        ),
      ]);

      const text = result.choices?.[0]?.message?.content?.trim();
      if (!text) return null;

      console.log(`\x1b[35m[LLM RETORT]\x1b[0m "${text}"`);
      return { text };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`\x1b[33m[LLM]\x1b[0m Generation failed (${errMsg}), falling back to sticker-only.`);
      return null;
    }
  }
}
