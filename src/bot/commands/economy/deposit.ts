import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit money to bank')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to deposit')
        .setRequired(true)
        .setMinValue(1)
    ),
  category: 'economy',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const amount = interaction.options.get('amount')?.value as number;

    const row = db.prepare('SELECT balance FROM economy WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, interaction.user.id) as any;
    const balance = row?.balance ?? 0;

    if (balance < amount) {
      await interaction.reply({ content: `❌ You don't have enough money. You have $${balance.toLocaleString()}.`, ephemeral: true });
      return;
    }

    db.prepare(`
      INSERT INTO economy (guild_id, user_id, balance, bank)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        balance = balance - ?,
        bank = bank + ?
    `).run(interaction.guildId, interaction.user.id, -amount, amount, amount, amount);

    await interaction.reply({ content: `✅ Deposited $${amount.toLocaleString()} to your bank.` });
  },
};

export = command;
