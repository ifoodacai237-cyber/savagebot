/**
 * userUpdate.js — detecta mudanças de username de membros do servidor
 *
 * Quando um usuário muda de @oldname → @newname:
 *   1. @oldname entra para monitoramento (sniper) pois pode ficar disponível
 *   2. Posta no canal sniper: "@oldname entrou na mira"
 */

import { ChannelType } from 'discord.js';
import prisma from '../database/client.js';
import { isAvailable } from '../utils/checker.js';

export default {
  name: 'userUpdate',

  async execute(oldUser, newUser, client) {
    // Só nos interessa mudança de username global
    if (oldUser.username === newUser.username) return;

    const oldUsername = oldUser.username;
    const newUsername = newUser.username;

    console.log(`[SNIPER] Mudança detectada: @${oldUsername} → @${newUsername}`);

    try {
      // Evita duplicatas
      const existing = await prisma.sniperTarget.findUnique({ where: { username: oldUsername } });
      if (existing) return;

      // Checa imediatamente se já ficou livre
      const disponivel = await isAvailable(oldUsername);

      if (disponivel === true) {
        // Username disponível agora → posta como confirmado
        await prisma.sniperTarget.create({
          data: {
            username:    oldUsername,
            category:    'sniper',
            addedByName: newUsername,
            postedAt:    new Date(),
          },
        });
        await postarSniper(oldUsername, newUsername, true, client);
      } else {
        // Ainda tomado — entra na fila de monitoramento
        await prisma.sniperTarget.create({
          data: {
            username:    oldUsername,
            category:    'sniper',
            addedByName: newUsername,
          },
        });
        await postarSniper(oldUsername, newUsername, false, client);
      }
    } catch (err) {
      console.error('[SNIPER] Erro ao processar mudança de username:', err.message);
    }
  },
};

/**
 * Posta no canal sniper configurado.
 * @param {string}  target        - username que entrou na mira
 * @param {string}  newName       - novo username de quem mudou
 * @param {boolean} confirmado    - true se já está disponível agora
 * @param {*}       client
 */
export async function postarSniper(target, newName, confirmado, client) {
  if (!client) return;
  try {
    const configs = await prisma.publishChannel.findMany({ where: { category: 'sniper' } });
    if (!configs.length) return;

    const ts = Math.floor(Date.now() / 1000);

    let texto;
    if (confirmado) {
      texto = `<:sorte:1526435450259243180> **@${target}**\nconfirmado livre agora · <t:${ts}:R>`;
    } else {
      texto =
        `🎯 **@${target}** entrou na mira\n\n` +
        `@${target} mudou pra @${newName} — vou avisar quando **@${target}** liberar.\n` +
        `Estimativa: entre **em um dia** e **em 14 dias** (sem regra exata do Discord). Verifico de tempos em tempos.`;
    }

    const embed = { description: texto, color: confirmado ? 0x57F287 : 0xED4245 };

    for (const cfg of configs) {
      const ch = await client.channels.fetch(cfg.channelId).catch(() => null);
      if (!ch) continue;
      try {
        if (ch.type === ChannelType.GuildForum) {
          await ch.threads.create({ name: target, message: { embeds: [embed] } });
        } else {
          await ch.send({ embeds: [embed] });
        }
      } catch (err) {
        console.error(`[SNIPER] Erro ao postar em ${cfg.channelId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[SNIPER] Erro ao postar no canal sniper:', err.message);
  }
}
