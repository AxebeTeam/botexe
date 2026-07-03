import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user')

    .addStringOption(option =>
      option.setName('user_id')

        .setDescription('The user ID to unban')

        .setRequired(true)
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const userId = interaction.options.get('user_id')?.value as string;

    await interaction.deferReply();

    try {
      await interaction.guild!.members.unban(userId);
      await interaction.editReply({ content: t(lang, 'moderation.unbanned', { user: userId }) });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to unban user: ${error}` });
    }
  },
};

export = command;
