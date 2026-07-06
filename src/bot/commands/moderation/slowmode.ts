import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for a channel')
    .addIntegerOption(option =>
      option.setName('seconds').setDescription('Slowmode duration in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600)
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const seconds = interaction.options.get('seconds')?.value as number;
    const channel = interaction.channel;

    if (!channel || !('setRateLimitPerUser' in channel)) {
      await interaction.reply({ content: '❌ This command can only be used in text channels.', ephemeral: true });
      return;
    }

    await (channel as any).setRateLimitPerUser(seconds, `Set by ${interaction.user.tag}`);

    if (seconds === 0) {
      await interaction.reply({ content: '✅ Slowmode disabled.' });
    } else {
      await interaction.reply({ content: `✅ Slowmode set to **${seconds}** second(s).` });
    }
  },
};

export = command;
