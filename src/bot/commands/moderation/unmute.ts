import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member')

    .addUserOption(option =>
      option.setName('user')

        .setDescription('The user to unmute')

        .setRequired(true)
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const user = interaction.options.get('user')?.user;

    await interaction.deferReply();

    if (!user) {
      await interaction.editReply({ content: t(lang, 'common.invalid_user') });
      return;
    }

    if (!interaction.guildId) {
      await interaction.editReply({ content: 'Server only command.' });
      return;
    }

    const member = interaction.guild!.members.cache.get(user.id);
    if (!member) {
      await interaction.editReply({ content: t(lang, 'common.invalid_user') });
      return;
    }

    try {
      const muted = db.prepare('SELECT * FROM muted_users WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, user.id);
      if (!muted) {
        await interaction.editReply({ content: t(lang, 'moderation.not_muted') });
        return;
      }

      await member.timeout(null);
      db.prepare('DELETE FROM muted_users WHERE guild_id = ? AND user_id = ?').run(interaction.guildId, user.id);

      await user.send({ content: t(lang, 'moderation.dm_unmuted', { guild: interaction.guild!.name }) }).catch(() => {});

      await interaction.editReply({ content: t(lang, 'moderation.unmuted', { user: user.tag }) });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to unmute user: ${error}` });
    }
  },
};

export = command;
