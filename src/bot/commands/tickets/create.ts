import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create a support ticket')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for opening the ticket')
    ),
  category: 'tickets',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild!;
      const categoryName = 'Tickets';

      let category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === categoryName
      );

      if (!category) {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
        });
      }

      const safeName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      const ticketChannel = await guild.channels.create({
        name: safeName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
        ],
      });

      db.prepare(
        'INSERT INTO tickets (guild_id, channel_id, user_id, status) VALUES (?, ?, ?, ?)'
      ).run(guild.id, ticketChannel.id, interaction.user.id, 'open');

      const embed = new EmbedBuilder()
        .setTitle('Support Ticket')
        .setDescription('A new support ticket has been created.')
        .setColor(0x00ff00)
        .addFields(
          { name: 'User', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason, inline: true },
        )
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton);

      await ticketChannel.send({ embeds: [embed], components: [row] });
      await interaction.editReply({ content: `Ticket created: ${ticketChannel}` });
    } catch (error) {
      await interaction.editReply({ content: `Failed to create ticket: ${error}` });
    }
  },
};

export = command;
