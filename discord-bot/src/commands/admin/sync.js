import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { registerSlashCommands } from '../../utils/loader.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Força o re-registro de todos os slash commands (apenas dono do servidor)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  name: 'sync',

  async execute(interaction, client) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Apenas o **dono do servidor** pode usar este comando.'),
        ],
        flags: 64,
      });
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9B4FD6)
          .setDescription('🔄 Sincronizando comandos... aguarde alguns segundos.'),
      ],
      flags: 64,
    });

    try {
      await registerSlashCommands(client);

      const total = client.commands.size;
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Sync concluído')
            .setDescription(`**${total} comandos** registrados com sucesso no servidor e globalmente.`)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[SYNC] Erro ao sincronizar comandos:', err.message);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Erro no sync')
            .setDescription(`Não foi possível sincronizar: \`${err.message}\``),
        ],
      });
    }
  },

  async executePrefix(message, args, client) {
    if (message.author.id !== message.guild.ownerId) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ Apenas o **dono do servidor** pode usar este comando.')] });
    }
    const msg = await message.reply({ embeds: [new EmbedBuilder().setColor(0x9B4FD6).setDescription('🔄 Sincronizando comandos... aguarde.')] });
    try {
      await registerSlashCommands(client);
      return msg.edit({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription('✅ Comandos sincronizados com sucesso!')] });
    } catch (err) {
      return msg.edit({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`❌ Erro no sync: \`${err.message}\``)] });
    }
  },
};
