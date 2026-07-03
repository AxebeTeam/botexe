import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your purchased items'),
  category: 'economy',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const items = db.prepare(`
      SELECT si.name, si.emoji, si.description, ui.purchased_at
      FROM user_inventory ui
      JOIN shop_items si ON ui.item_id = si.id
      WHERE ui.guild_id = ? AND ui.user_id = ?
      ORDER BY ui.purchased_at DESC
    `).all(interaction.guildId, interaction.user.id) as any[];

    if (items.length === 0) {
      await interaction.reply({ content: 'Your inventory is empty. Use `/shop` to see available items.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Inventory`)
      .setColor(0x6c5ce7)
      .setDescription(items.map(item =>
        `${item.emoji || '📦'} **${item.name}** — ${item.description || ''}`
      ).join('\n'))
      .setFooter({ text: `${items.length} item(s)` });

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;