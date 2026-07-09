import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('banlist')
    .setDescription('Show banned users'),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const bans = await interaction.guild!.bans.fetch();
      if (bans.size === 0) {
        await interaction.editReply({ content: '✅ No banned users.' });
        return;
      }

      const list = bans.map(b => `**${b.user.tag}** (${b.user.id}) — ${b.reason || 'No reason'}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`🔨 Ban List (${bans.size})`)
        .setDescription(list.substring(0, 4096))
        .setColor(0xe74c3c)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed: ${error}` });
    }
  },
};

export = command;
