import { config } from './config.js';
import { stickerPool } from './sticker-pool.js';
import { WhatsAppTransport } from './transport/index.js';
import { Dispatcher } from './dispatcher.js';

const initialStickers = stickerPool.scanAvailableFiles();
const stickerCountLabel =
  initialStickers.length > 0
    ? `\x1b[32m(${initialStickers.length} .webp stickers ready)\x1b[0m`
    : '\x1b[31m(EMPTY - No .webp files found!)\x1b[0m';

console.log('\n\x1b[1;36m====================================================\x1b[0m');
console.log('\x1b[1;36m       WhatsApp Auto-Sticker Annoyance Bot         \x1b[0m');
console.log('\x1b[1;36m====================================================\x1b[0m');
console.log(`- \x1b[1mReply Mode:\x1b[0m          ${config.replyMode.toUpperCase()}`);
console.log(
  `- \x1b[1mTarget Group:\x1b[0m        ${config.targetGroupJid || '\x1b[33m(Not set - listening to all for discovery)\x1b[0m'}`
);
console.log(
  `- \x1b[1mTarget Phone:\x1b[0m        ${config.targetSenderPhone || '\x1b[33m(Not set - listening to all for discovery)\x1b[0m'}`
);
console.log(`- \x1b[1mDebounce Wait:\x1b[0m       ${config.debounceWaitMs}ms`);
console.log(`- \x1b[1mRandom Jitter:\x1b[0m       ${config.jitterMinMs}ms - ${config.jitterMaxMs}ms`);
console.log(`- \x1b[1mSimulate Typing:\x1b[0m     ${config.simulateTyping}`);
console.log(`- \x1b[1mSticker Pool:\x1b[0m        ${config.stickersDir} ${stickerCountLabel}`);
console.log(
  `- \x1b[1mDiscovery Mode:\x1b[0m      ${config.discoveryMode ? '\x1b[32mEnabled\x1b[0m' : 'Disabled'}`
);
console.log(
  `- \x1b[1mSelf-Test Mode:\x1b[0m      ${config.allowSelfTest ? '\x1b[32mEnabled (Will reply to your own messages)\x1b[0m' : 'Disabled'}`
);
console.log(
  `- \x1b[1mPairing Method:\x1b[0m      ${config.myPhoneNumber ? `\x1b[32mPairing Code for +${config.myPhoneNumber}\x1b[0m` : 'Terminal QR Code'}`
);
console.log('\x1b[1;36m====================================================\x1b[0m\n');

if (initialStickers.length === 0) {
  console.warn(
    `\x1b[33m[WARN]\x1b[0m No .webp stickers found in "${config.stickersDir}". Replies will be skipped until stickers are added.`
  );
}

const botStartedAt = Math.floor(Date.now() / 1000);

const transport = new WhatsAppTransport(
  './auth_info',
  async (msg) => dispatcher.handle(msg),
  botStartedAt
);

const dispatcher = new Dispatcher(transport, botStartedAt);

void transport.start();
