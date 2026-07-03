import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ticket-add')
    .setDescription('Add a user to the ticket')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to add')
        .setRequired(true)
    ),
  category: 'tickets',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const user = interaction.options.getUser('user', true);

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel as any;
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channel.id) as any;

    if (!ticket) {
      await interaction.editReply({ content: 'This channel is not a ticket.' });
      return;
    }

    if (ticket.status === 'closed') {
      await interaction.editReply({ content: 'This ticket is closed.' });
      return;
    }

    try {
      await channel.permissionOverwrites.create(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      await interaction.editReply({ content: `Added ${user} to the ticket.` });
    } catch (error) {
      await interaction.editReply({ content: `Failed to add user: ${error}` });
    }
  },
};

export = command;
