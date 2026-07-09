import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(option => option.setName('user').setDescription('Only delete messages from this user').setRequired(false)),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.get('amount')?.value as number;
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel as TextChannel;
    if (!channel) {
      await interaction.editReply({ content: '❌ Cannot access this channel.' });
      return;
    }

    try {
      let messages = await channel.messages.fetch({ limit: amount });

      if (targetUser) {
        messages = messages.filter(m => m.author.id === targetUser.id);
      }

      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

      const deleted = await channel.bulkDelete(messages, true);
      await interaction.editReply({ content: `✅ Deleted **${deleted.size}** message(s).` });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to delete messages: ${error}` });
    }
  },
};

export = command;
