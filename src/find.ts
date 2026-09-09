import path from 'node:path';
import makeWASocket, { Browsers, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';

async function main() {
  const searchTerm = process.argv.slice(2).join(' ').toLowerCase();

  const authFolder = path.resolve(process.cwd(), './auth_info');
  const { state } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
  });

  sock.ev.on('connection.update', async (update) => {
    if (update.connection === 'open') {
      console.log('\n\x1b[32m[CONNECTED]\x1b[0m Fetching groups from your WhatsApp account...\n');

      try {
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);

        const filtered = searchTerm
          ? groupList.filter((g) => g.subject.toLowerCase().includes(searchTerm))
          : groupList;

        if (filtered.length === 0) {
          console.log(`\x1b[33mNo groups found matching "${searchTerm}".\x1b[0m`);
        } else {
          console.log(`Found \x1b[36m${filtered.length}\x1b[0m group(s):\n`);

          for (const g of filtered) {
            console.log(`\x1b[1;36m====================================================\x1b[0m`);
            console.log(`\x1b[1mGroup:\x1b[0m    \x1b[33m${g.subject}\x1b[0m`);
            console.log(`\x1b[1mGroup ID:\x1b[0m \x1b[32m${g.id}\x1b[0m`);
            console.log(`\x1b[1mMembers (${g.participants.length}):\x1b[0m`);

            // Print participants (up to 20 or all if searched specifically)
            const showLimit = searchTerm ? g.participants.length : 15;
            for (const p of g.participants.slice(0, showLimit)) {
              const role = p.admin ? ` \x1b[35m(${p.admin})\x1b[0m` : '';
              const userTag = (p as { username?: string }).username ? ` \x1b[90m(@${(p as { username?: string }).username})\x1b[0m` : '';
              
              if (p.phoneNumber) {
                const cleanPhone = p.phoneNumber.split('@')[0];
                const lid = p.id.split('@')[0];
                console.log(`   - \x1b[32m+${cleanPhone}\x1b[0m (LID: ${lid})${userTag}${role}`);
              } else {
                const idStr = p.id.split('@')[0];
                console.log(`   - \x1b[33mID: ${idStr}\x1b[0m${userTag}${role}`);
              }
            }

            if (g.participants.length > showLimit) {
              console.log(`   \x1b[90m... and ${g.participants.length - showLimit} more members\x1b[0m`);
            }
          }
          console.log(`\x1b[1;36m====================================================\x1b[0m\n`);
        }
      } catch (err) {
        console.error('Failed to fetch groups:', err);
      } finally {
        process.exit(0);
      }
    }
  });
}

void main();
