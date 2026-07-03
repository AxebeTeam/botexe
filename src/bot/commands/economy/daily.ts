import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim daily reward'),
  category: 'economy',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);

    const row = db.prepare('SELECT last_daily FROM economy WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, interaction.user.id) as any;

    if (row?.last_daily) {
      const last = new Date(row.last_daily);
      const now = new Date();
      const diff = now.getTime() - last.getTime();
      const hours = Math.floor(diff / 3600000);
      if (hours < 24) {
        const remaining = 24 - hours;
        await interaction.reply({ content: `⏰ You already claimed your daily! Come back in ${remaining} hour(s).`, ephemeral: true });
        return;
      }
    }

    const amount = Math.floor(Math.random() * 101) + 100;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO economy (guild_id, user_id, balance, bank, last_daily)
      VALUES (?, ?, ?, 0, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        balance = balance + ?,
        last_daily = ?
    `).run(interaction.guildId, interaction.user.id, amount, now, amount, now);

    await interaction.reply({ content: `🎉 You claimed your daily reward of **$${amount}**!` });
  },
};

export = command;
