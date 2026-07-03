import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages in the channel')

    .addIntegerOption(option =>
      option.setName('amount')

        .setDescription('Number of messages to clear (1-100)')

        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const amount = interaction.options.get('amount')?.value as number;

    await interaction.deferReply();

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply({ content: '❌ This command can only be used in text channels.' });
      return;
    }

    try {
      const messages = await interaction.channel.bulkDelete(amount, true);
      const reply = await interaction.editReply({ content: t(lang, 'moderation.cleared', { amount: String(messages.size) }) });
      setTimeout(() => reply.delete().catch(() => {}), 3000);
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to clear messages: ${error}` });
    }
  },
};

export = command;
