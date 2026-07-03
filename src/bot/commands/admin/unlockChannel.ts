import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel')

    .addChannelOption(option =>
      option.setName('channel')

        .setDescription('Channel to unlock (default: current)')

    ),
  category: 'admin',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const channel = (interaction.options.get('channel')?.channel || interaction.channel) as any;

    await interaction.deferReply();

    try {
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
        SendMessages: null,
      });
      await interaction.editReply({ content: t(lang, 'admin.channel_unlocked') });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to unlock channel: ${error}` });
    }
  },
};

export = command;
