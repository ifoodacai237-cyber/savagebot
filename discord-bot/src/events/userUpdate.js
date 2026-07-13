/**
 * userUpdate.js
 * Detecta quando um usuário muda de username (pomelo).
 * Posta "entrou na mira" no canal sniper e rastreia a disponibilidade.
 */

import prisma from '../database/client.js';
import { postSniperAlerta, classifyUsername, isAvailable } from '../utils/usernameMonitor.js';

const CATEGORY_FIELD = {
  realwordpt: 'channelRealwordPt',
  realword:   'channelRealword',
  mixed:      'channelMixed',
  numbers:    'channelNumbers',
  sniper:     'channelSniper',
};

export default {
  name: 'userUpdate',
  once: false,

  async execute(oldUser, newUser, client) {
    try {
      const oldName = oldUser.username;
      const newName = newUser.username;

      // Só age se o username realmente mudou
      if (!oldName || !newName || oldName === newName) return;

      console.log(`[SNIPER] username mudou: ${oldName} → ${newName} (ID: ${newUser.id})`);

      // Sempre posta no canal sniper (monitora qualquer mudança de username)
      await postSniperAlerta(client, oldName, newUser.id, newName);

      // Verifica também se o username é de uma categoria de palavra
      // e checa disponibilidade logo após a mudança
      const category = classifyUsername(oldName);
      if (category !== 'sniper') {
        setTimeout(async () => {
          try {
            const avail = await isAvailable(oldName);
            if (avail !== true) return;

            const configs = await prisma.sniperConfig.findMany({ where: { enabled: true } });
            const field   = CATEGORY_FIELD[category];
            if (!field) return;

            const ts = Math.floor(Date.now() / 1000);
            const msg = `🎉 **@${oldName}**\ndisponível agora · <t:${ts}:R>`;

            for (const cfg of configs) {
              const channelId = cfg[field];
              if (!channelId) continue;
              try {
                const ch = await client.channels.fetch(channelId);
                await ch.send(msg);
              } catch {}
            }

            await prisma.sniperTarget.upsert({
              where:  { username: oldName },
              create: {
                username: oldName, category,
                postedAt: new Date(), droppedById: newUser.id,
                pickedByName: newName, sniperAlerted: true,
              },
              update: { postedAt: new Date(), availableAt: new Date() },
            });
          } catch (e) {
            console.error('[SNIPER] Erro ao checar username pós-mudança:', e.message);
          }
        }, 5_000);
      }

    } catch (err) {
      console.error('[SNIPER] userUpdate error:', err.message);
    }
  },
};
