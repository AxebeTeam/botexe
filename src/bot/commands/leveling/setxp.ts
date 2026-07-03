import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Manage levels')
    .addSubcommand(sub =>
      sub.setName('setxp')
        .setDescription('Set XP for a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to set XP for')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('XP amount to set')
            .setRequired(true))),
  category: 'leveling',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (amount < 0) {
      await interaction.reply({ content: 'XP amount cannot be negative.', flags: MessageFlags.Ephemeral });
      return;
    }

    const existing = db.prepare('SELECT id FROM levels WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, target.id);

    if (existing) {
      db.prepare('UPDATE levels SET xp = ?, level = ? WHERE guild_id = ? AND user_id = ?').run(amount, 1, interaction.guildId, target.id);
    } else {
      db.prepare('INSERT INTO levels (guild_id, user_id, xp, level) VALUES (?, ?, ?, ?)').run(interaction.guildId, target.id, amount, 1);
    }

    const embed = new EmbedBuilder()
      .setTitle('XP Set')
      .setColor(0x00ff00)
      .setDescription(`Set ${target.tag}'s XP to **${amount}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
