import fs from 'node:fs';
import { config } from './config.js';
import { WhatsAppClient } from './whatsapp.js';

console.log('\n\x1b[1;36m====================================================\x1b[0m');
console.log('\x1b[1;36m       WhatsApp Auto-Sticker Annoyance Bot         \x1b[0m');
console.log('\x1b[1;36m====================================================\x1b[0m');
console.log(`- \x1b[1mReply Mode:\x1b[0m          ${config.replyMode.toUpperCase()}`);
console.log(`- \x1b[1mTarget Group:\x1b[0m        ${config.targetGroupJid || '\x1b[33m(Not set - listening to all for discovery)\x1b[0m'}`);
console.log(`- \x1b[1mTarget Phone:\x1b[0m        ${config.targetSenderPhone || '\x1b[33m(Not set - listening to all for discovery)\x1b[0m'}`);
console.log(`- \x1b[1mDebounce Wait:\x1b[0m       ${config.debounceWaitMs}ms`);
console.log(`- \x1b[1mRandom Jitter:\x1b[0m       ${config.jitterMinMs}ms - ${config.jitterMaxMs}ms`);
console.log(`- \x1b[1mSimulate Typing:\x1b[0m     ${config.simulateTyping}`);
console.log(`- \x1b[1mSticker File:\x1b[0m        ${config.stickerPath} ${fs.existsSync(config.stickerPath) ? '\x1b[32m(Found)\x1b[0m' : '\x1b[31m(MISSING)\x1b[0m'}`);
console.log(`- \x1b[1mDiscovery Mode:\x1b[0m      ${config.discoveryMode ? '\x1b[32mEnabled\x1b[0m' : 'Disabled'}`);
console.log(`- \x1b[1mSelf-Test Mode:\x1b[0m      ${config.allowSelfTest ? '\x1b[32mEnabled (Will reply to your own messages)\x1b[0m' : 'Disabled'}`);
console.log(`- \x1b[1mPairing Method:\x1b[0m      ${config.myPhoneNumber ? `\x1b[32mPairing Code for +${config.myPhoneNumber}\x1b[0m` : 'Terminal QR Code'}`);
console.log('\x1b[1;36m====================================================\x1b[0m\n');

if (!fs.existsSync(config.stickerPath)) {
  console.error(`\x1b[31m[ERROR]\x1b[0m Could not find sticker file at "${config.stickerPath}". Please make sure lion.webp is present.`);
}

const client = new WhatsAppClient();
void client.start();
