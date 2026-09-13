import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

export interface StickerCandidate {
  filename: string;
  filePath: string;
  buffer: Buffer;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export class StickerPool {
  private stickersDir: string;
  private deck: string[] = [];
  private lastServed: string | null = null;

  constructor(stickersDir: string = config.stickersDir) {
    this.stickersDir = stickersDir;
  }

  public getStickersDir(): string {
    return this.stickersDir;
  }

  public getLastServed(): string | null {
    return this.lastServed;
  }

  /**
   * Scans stickersDir dynamically for all .webp files (case-insensitive).
   */
  public scanAvailableFiles(): string[] {
    if (!fs.existsSync(this.stickersDir)) {
      return [];
    }

    try {
      const entries = fs.readdirSync(this.stickersDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.webp'))
        .map((entry) => entry.name);
    } catch (err) {
      console.error(`\x1b[31m[STICKER POOL ERROR]\x1b[0m Failed to read directory "${this.stickersDir}":`, err);
      return [];
    }
  }

  /**
   * Lightweight validation for WhatsApp sticker constraints:
   * 1. File exists and size <= 1MB (1,048,576 bytes)
   * 2. First 12 bytes contain RIFF....WEBP header
   */
  public validateWebpFile(fullPath: string): ValidationResult {
    try {
      if (!fs.existsSync(fullPath)) {
        return { valid: false, reason: 'File does not exist' };
      }

      const stat = fs.statSync(fullPath);
      if (stat.size === 0) {
        return { valid: false, reason: 'File is empty (0 bytes)' };
      }

      const MAX_STICKER_SIZE = 1024 * 1024; // 1MB WhatsApp sticker limit
      if (stat.size > MAX_STICKER_SIZE) {
        return {
          valid: false,
          reason: `File size (${(stat.size / 1024).toFixed(1)}KB) exceeds WhatsApp 1MB limit`,
        };
      }

      // Read magic bytes (first 12 bytes: RIFF at 0..3, WEBP at 8..11)
      const fd = fs.openSync(fullPath, 'r');
      const headerBuffer = Buffer.alloc(12);
      fs.readSync(fd, headerBuffer, 0, 12, 0);
      fs.closeSync(fd);

      const isRiff = headerBuffer.subarray(0, 4).toString('ascii') === 'RIFF';
      const isWebp = headerBuffer.subarray(8, 12).toString('ascii') === 'WEBP';

      if (!isRiff || !isWebp) {
        return { valid: false, reason: 'Not a valid WebP file (missing RIFF/WEBP header)' };
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Fisher-Yates shuffle with non-consecutive repeat protection.
   * Ensures the next popped card (arr[arr.length - 1]) does not match lastServed if 2+ items exist.
   */
  private shuffle(items: string[]): string[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }

    // Anti-repetition: if more than 1 item and the first to be popped matches lastServed, swap it
    if (arr.length > 1 && arr[arr.length - 1] === this.lastServed) {
      const swapIndex = Math.floor(Math.random() * (arr.length - 1)); // 0 <= swapIndex < arr.length - 1
      const temp = arr[arr.length - 1];
      arr[arr.length - 1] = arr[swapIndex];
      arr[swapIndex] = temp;
    }

    return arr;
  }

  /**
   * Refreshes the deck using current disk contents.
   */
  private replenishDeck(): void {
    const available = this.scanAvailableFiles();
    if (available.length === 0) {
      this.deck = [];
      return;
    }
    this.deck = this.shuffle(available);
  }

  /**
   * Draws the next sticker from the pool using the Shuffle Bag algorithm
   * and a self-healing rotation cascade.
   */
  public drawSticker(): StickerCandidate | null {
    let attempts = 0;
    const maxAttempts = 2; // Allow at most 2 deck cycles to prevent infinite loops if all files on disk are invalid

    while (attempts < maxAttempts) {
      if (this.deck.length === 0) {
        this.replenishDeck();
      }

      if (this.deck.length === 0) {
        console.error(
          `\x1b[31m[STICKER POOL ERROR]\x1b[0m No .webp stickers found in directory "${this.stickersDir}". Aborting sticker reply.`
        );
        return null;
      }

      // Rotation cascade: pull cards from deck until a valid WebP is found
      while (this.deck.length > 0) {
        const candidateFilename = this.deck.pop()!;
        const fullPath = path.join(this.stickersDir, candidateFilename);

        const validation = this.validateWebpFile(fullPath);
        if (!validation.valid) {
          console.warn(
            `\x1b[33m[STICKER POOL WARN]\x1b[0m Sticker "${candidateFilename}" failed validation (${validation.reason}). Rotating to next sticker...`
          );
          continue;
        }

        try {
          const buffer = fs.readFileSync(fullPath);
          this.lastServed = candidateFilename;
          return {
            filename: candidateFilename,
            filePath: fullPath,
            buffer,
          };
        } catch (readErr) {
          console.warn(
            `\x1b[33m[STICKER POOL WARN]\x1b[0m Failed to read file "${candidateFilename}":`,
            readErr,
            'Rotating to next sticker...'
          );
        }
      }

      attempts++;
    }

    console.error(
      `\x1b[31m[STICKER POOL ERROR]\x1b[0m All sticker candidates in "${this.stickersDir}" failed validation or could not be read. Aborting sticker reply.`
    );
    return null;
  }
}

export const stickerPool = new StickerPool();
