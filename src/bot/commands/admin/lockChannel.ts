import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel')

    .addChannelOption(option =>
      option.setName('channel')

        .setDescription('Channel to lock (default: current)')

    ),
  category: 'admin',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const channel = (interaction.options.get('channel')?.channel || interaction.channel) as any;

    await interaction.deferReply();

    try {
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
        SendMessages: false,
      });
      await interaction.editReply({ content: t(lang, 'admin.channel_locked') });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to lock channel: ${error}` });
    }
  },
};

export = command;
