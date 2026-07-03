import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('The item name to buy')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  category: 'economy',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    if (!interaction.inCachedGuild()) return;

    const itemName = interaction.options.getString('item', true);
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const item = db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND name = ?').get(guildId, itemName) as any;
    if (!item) {
      await interaction.reply({ content: 'That item does not exist in the shop.', ephemeral: true });
      return;
    }

    const econ = db.prepare('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?').get(guildId, userId) as any;
    if (!econ || econ.balance < item.price) {
      await interaction.reply({ content: `You need 💰 ${item.price} to buy this. You have 💰 ${econ?.balance || 0}.`, ephemeral: true });
      return;
    }

    const alreadyOwned = db.prepare('SELECT * FROM user_inventory WHERE guild_id = ? AND user_id = ? AND item_id = ?').get(guildId, userId, item.id);
    if (alreadyOwned) {
      await interaction.reply({ content: 'You already own this item!', ephemeral: true });
      return;
    }

    db.prepare('UPDATE economy SET balance = balance - ? WHERE guild_id = ? AND user_id = ?').run(item.price, guildId, userId);
    db.prepare('INSERT INTO user_inventory (guild_id, user_id, item_id) VALUES (?, ?, ?)').run(guildId, userId, item.id);

    if (item.role_id && interaction.member) {
      await interaction.member.roles.add(item.role_id).catch(() => {});
    }

    await interaction.reply({ content: `✅ You bought **${item.emoji || '🛒'} ${item.name}** for 💰 ${item.price}!` });
  },
};

export = command;