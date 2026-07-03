import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Server economy leaderboard'),
  category: 'economy',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);

    const rows = db.prepare('SELECT user_id, balance, bank, (balance + bank) as total FROM economy WHERE guild_id = ? ORDER BY total DESC LIMIT 10').all(interaction.guildId) as any[];

    if (rows.length === 0) {
      await interaction.reply({ content: 'No economy data yet.' });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 Economy Leaderboard')
      .setColor(0xffd700)
      .setDescription(
        rows.map((row, i) => {
          const user = interaction.guild?.members.cache.get(row.user_id)?.user;
          const name = user?.username || 'Unknown User';
          return `**${i + 1}.** ${name} — **$${(row.balance + row.bank).toLocaleString()}** (Wallet: $${row.balance.toLocaleString()} | Bank: $${row.bank.toLocaleString()})`;
        }).join('\n')
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
