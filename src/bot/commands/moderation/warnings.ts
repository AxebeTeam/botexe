import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')

    .addUserOption(option =>
      option.setName('user')

        .setDescription('The user to check')

        .setRequired(true)
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const user = interaction.options.get('user')?.user;

    await interaction.deferReply();

    if (!user || !interaction.guildId) {
      await interaction.editReply({ content: t(lang, 'common.invalid_user') });
      return;
    }

    const warnings = db.prepare(
      'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC'
    ).all(interaction.guildId, user.id) as any[];

    if (warnings.length === 0) {
      await interaction.editReply({ content: t(lang, 'moderation.no_warnings') });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(t(lang, 'moderation.warnings_title', { user: user.tag }))
      .setColor(0xffa500)
      .setDescription(warnings.map((w, i) =>
        `**#${i + 1}** - ${t(lang, 'moderation.warned_by')}: <@${w.moderator_id}>\n${t(lang, 'moderation.reason')}: ${w.reason}\n${t(lang, 'moderation.date')}: ${w.created_at}`
      ).join('\n\n'))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export = command;
