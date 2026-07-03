import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';
import { PermissionLevel, getPermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close your ticket'),
  category: 'tickets',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);

    await interaction.deferReply();

    const channel = interaction.channel!;
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channel.id) as any;

    if (!ticket) {
      await interaction.editReply({ content: 'This channel is not a ticket.' });
      return;
    }

    if (ticket.status === 'closed') {
      await interaction.editReply({ content: 'This ticket is already closed.' });
      return;
    }

    const member = interaction.member as any;
    const isCreator = interaction.user.id === ticket.user_id;
    const isOwner = getPermissionLevel(member) >= PermissionLevel.SERVER_OWNER;

    if (!isCreator && !isOwner) {
      await interaction.editReply({ content: 'Only the ticket creator or server owner can close this ticket.' });
      return;
    }

    const messages = await channel.messages.fetch({ limit: 100 });
    const transcriptLines = messages.reverse().map(m =>
      `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content || '[Embed/Attachment/Sticker]'}`
    );
    const transcript = transcriptLines.join('\n');

    try {
      const creator = await interaction.client.users.fetch(ticket.user_id);
      await creator.send({
        content: `**Ticket Transcript - ${channel.name}**\n\`\`\`\n${transcript.slice(0, 1900)}\n\`\`\``,
      });
    } catch {
      // DM may be closed or user not reachable
    }

    db.prepare('UPDATE tickets SET status = ? WHERE channel_id = ?').run('closed', channel.id);

    await interaction.editReply({ content: 'Closing ticket in 5 seconds...' });

    setTimeout(async () => {
      try {
        await channel.delete();
      } catch {
        // Channel may already be deleted
      }
    }, 5000);
  },
};

export = command;
