import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')

    .addUserOption(option =>
      option.setName('user')

        .setDescription('The user to warn')

        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')

        .setDescription('Reason for warning')

        .setRequired(true)
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const user = interaction.options.get('user')?.user;
    const reason = interaction.options.get('reason')?.value as string;

    await interaction.deferReply();

    if (!user) {
      await interaction.editReply({ content: t(lang, 'common.invalid_user') });
      return;
    }

    if (!interaction.guildId) {
      await interaction.editReply({ content: 'Server only command.' });
      return;
    }

    db.prepare(
      'INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)'
    ).run(interaction.guildId, user.id, interaction.user.id, reason);

    const warnCount = db.prepare(
      'SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?'
    ).get(interaction.guildId, user.id) as any;

    await interaction.editReply({
      content: t(lang, 'moderation.warned', { user: user.tag, reason }) + ` (Warning #${warnCount.count})`,
    });
  },
};

export = command;
