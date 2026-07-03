import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your level rank')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check rank of')
        .setRequired(false)),
  category: 'leveling',
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const lang = getLanguageForGuild(interaction.guildId);

    const row = db.prepare('SELECT xp, level FROM levels WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, target.id) as any;
    const xp = row?.xp || 0;
    const level = row?.level || 1;

    const nextLevelXp = level * 100;
    const xpNeeded = Math.max(0, nextLevelXp - xp);

    const embed = new EmbedBuilder()
      .setTitle(`${target.tag} - Rank`)
      .setColor(0x00ff00)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Level', value: String(level), inline: true },
        { name: 'XP', value: String(xp), inline: true },
        { name: 'XP Needed for Next Level', value: String(xpNeeded), inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
