import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the server shop'),
  category: 'economy',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const items = db.prepare('SELECT * FROM shop_items WHERE guild_id = ? ORDER BY price ASC').all(interaction.guildId) as any[];

    if (items.length === 0) {
      await interaction.reply({ content: 'The shop is empty! No items available.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Server Shop')
      .setColor(0x6c5ce7)
      .setDescription(items.map((item, i) =>
        `${i + 1}. ${item.emoji || '🛒'} **${item.name}** — 💰 ${item.price}\n   ${item.description || ''}`
      ).join('\n'))
      .setFooter({ text: `Use /buy <item> to purchase` });

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;