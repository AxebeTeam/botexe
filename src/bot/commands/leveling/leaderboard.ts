import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('levelboard')
    .setDescription('Server level leaderboard'),
  category: 'leveling',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);

    const rows = db.prepare('SELECT user_id, xp, level FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 10').all(interaction.guildId) as any[];

    const embed = new EmbedBuilder()
      .setTitle('Server Level Leaderboard')
      .setColor(0x00ff00)
      .setTimestamp();

    if (rows.length === 0) {
      embed.setDescription('No one has earned XP yet.');
    } else {
      let description = '';
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const member = await interaction.guild?.members.fetch(row.user_id).catch(() => null);
        const username = member?.user?.tag || row.user_id;
        description += `**${i + 1}.** ${username} — Level ${row.level} (${row.xp} XP)\n`;
      }
      embed.setDescription(description);
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
