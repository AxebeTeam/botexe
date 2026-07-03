import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Pay another user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to pay')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to pay')
        .setRequired(true)
        .setMinValue(1)
    ),
  category: 'economy',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const target = interaction.options.get('user')?.user;

    if (!target) {
      await interaction.reply({ content: '❌ Invalid user.', ephemeral: true });
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: '❌ You cannot pay yourself.', ephemeral: true });
      return;
    }

    const amount = interaction.options.get('amount')?.value as number;

    const senderRow = db.prepare('SELECT balance FROM economy WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, interaction.user.id) as any;
    const senderBalance = senderRow?.balance ?? 0;

    if (senderBalance < amount) {
      await interaction.reply({ content: `❌ You don't have enough money. You have $${senderBalance.toLocaleString()}.`, ephemeral: true });
      return;
    }

    db.prepare(`
      INSERT INTO economy (guild_id, user_id, balance, bank)
      VALUES (?, ?, ?, 0)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        balance = balance - ?
    `).run(interaction.guildId, interaction.user.id, -amount, amount);

    db.prepare(`
      INSERT INTO economy (guild_id, user_id, balance, bank)
      VALUES (?, ?, ?, 0)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        balance = balance + ?
    `).run(interaction.guildId, target.id, amount, amount);

    await interaction.reply({ content: `✅ You paid **${target.username}** $${amount.toLocaleString()}.` });
  },
};

export = command;
