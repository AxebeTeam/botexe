import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for a channel')

    .addIntegerOption(option =>
      option.setName('seconds')

        .setDescription('Slowmode in seconds (0 to disable)')

        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    )
    .addChannelOption(option =>
      option.setName('channel')

        .setDescription('Channel (default: current)')

    ),
  category: 'admin',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const seconds = interaction.options.get('seconds')?.value as number;
    const channel = (interaction.options.get('channel')?.channel || interaction.channel) as any;

    await interaction.deferReply();

    try {
      await channel.setRateLimitPerUser(seconds);
      await interaction.editReply({ content: t(lang, 'admin.slowmode_set', { seconds: String(seconds) }) });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to set slowmode: ${error}` });
    }
  },
};

export = command;
