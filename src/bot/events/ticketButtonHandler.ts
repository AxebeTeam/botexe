import { Client, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../../database/connection';
import { logger } from '../../utils/logger';

export function handleTicketButtons(client: Client): void {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.inCachedGuild()) return;

    const customId = interaction.customId;

    if (customId === 'close_ticket') {
      const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channelId) as any;

      if (!ticket) {
        await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
        return;
      }

      if (ticket.status === 'closed') {
        await interaction.reply({ content: 'This ticket is already closed.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const isCreator = interaction.user.id === ticket.user_id;
      const member = interaction.member;

      if (!isCreator && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.editReply({ content: 'Only the ticket creator or an admin can close this.' });
        return;
      }

      try {
        const messages = await interaction.channel!.messages.fetch({ limit: 100 });
        const transcriptLines = messages.reverse().map(m =>
          `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content || '[Embed/Attachment/Sticker]'}`
        );
        const transcript = transcriptLines.join('\n');

        try {
          const creator = await interaction.client.users.fetch(ticket.user_id);
          await creator.send({
            content: `**Ticket Transcript - ${interaction.channel!.name}**\n\`\`\`\n${transcript.slice(0, 1900)}\n\`\`\``,
          });
        } catch { }

        db.prepare('UPDATE tickets SET status = ? WHERE channel_id = ?').run('closed', interaction.channelId);
        await interaction.editReply({ content: 'Closing ticket in 5 seconds...' });

        setTimeout(async () => {
          try { await interaction.channel!.delete(); } catch { }
        }, 5000);
      } catch (error) {
        logger.error(`Close ticket error: ${error}`);
        await interaction.editReply({ content: `Error closing ticket: ${error}` });
      }
      return;
    }

    if (!customId.startsWith('ticket_panel_')) return;

    await interaction.deferReply({ ephemeral: true });

    try {
      const parts = customId.split('_');
      const panelName = parts[2];
      const categoryLabel = parts.slice(3).join('_');

      const panel = db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ? AND panel_name = ?')
        .get(interaction.guildId, panelName) as any;

      if (!panel) {
        await interaction.editReply({ content: 'Panel not found. It may have been deleted.' });
        return;
      }

      const categories = JSON.parse(panel.categories || '[]');
      const cat = categories.find((c: any) => c.label === categoryLabel);

      if (!cat) {
        await interaction.editReply({ content: 'Category not found in panel.' });
        return;
      }

      const existingTicket = db.prepare(
        'SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = ?'
      ).get(interaction.guildId, interaction.user.id, 'open') as any;

      if (existingTicket) {
        await interaction.editReply({
          content: `You already have an open ticket: <#${existingTicket.channel_id}>`,
        });
        return;
      }

      let categoryChannel = null;
      if (cat.ticket_category) {
        categoryChannel = interaction.guild.channels.cache.get(cat.ticket_category);
      }

      if (!categoryChannel) {
        categoryChannel = interaction.guild.channels.cache.find(
          c => c.type === ChannelType.GuildCategory && c.name === 'Tickets'
        );
      }

      if (!categoryChannel) {
        categoryChannel = await interaction.guild.channels.create({
          name: 'Tickets',
          type: ChannelType.GuildCategory,
        });
      }

      const safeName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      const permissionOverwrites: any[] = [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
      ];

      if (cat.support_roles && cat.support_roles.length > 0) {
        for (const roleId of cat.support_roles) {
          if (interaction.guild.roles.cache.has(roleId)) {
            permissionOverwrites.push({
              id: roleId,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            });
          }
        }
      }

      const ticketChannel = await interaction.guild.channels.create({
        name: safeName,
        type: ChannelType.GuildText,
        parent: categoryChannel.id,
        permissionOverwrites,
      });

      db.prepare(
        'INSERT INTO tickets (guild_id, channel_id, user_id, status) VALUES (?, ?, ?, ?)'
      ).run(interaction.guildId, ticketChannel.id, interaction.user.id, 'open');

      const welcomeMsg = cat.welcome_message || 'Support will be with you shortly.';

      const embed = new EmbedBuilder()
        .setTitle(`${cat.emoji || ''} ${cat.label} Ticket`)
        .setDescription(welcomeMsg)
        .setColor(0x00ff00)
        .addFields(
          { name: 'User', value: interaction.user.tag, inline: true },
          { name: 'Category', value: cat.label, inline: true },
        )
        .setTimestamp();

      if (cat.support_roles && cat.support_roles.length > 0) {
        const roleMentions = cat.support_roles.map((r: string) => `<@&${r}>`).join(' ');
        embed.addFields({ name: 'Support Team', value: roleMentions, inline: false });
      }

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton);

      const supportMention = cat.support_roles?.length > 0
        ? cat.support_roles.map((r: string) => `<@&${r}>`).join(' ')
        : '';

      await ticketChannel.send({
        content: `${interaction.user} ${supportMention}`,
        embeds: [embed],
        components: [row],
      });

      await interaction.editReply({
        content: `Ticket created: ${ticketChannel}`,
      });

    } catch (error) {
      logger.error(`Ticket panel error: ${error}`);
      await interaction.editReply({
        content: `Failed to create ticket: ${error}`,
      });
    }
  });
}
