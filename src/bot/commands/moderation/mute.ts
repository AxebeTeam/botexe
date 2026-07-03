import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';
import db from '../../../database/connection';

function parseDuration(duration: string): number | null {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member')

    .addUserOption(option =>
      option.setName('user')

        .setDescription('The user to mute')

        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duration')

        .setDescription('Duration (e.g. 10m, 1h, 1d)')

        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')

        .setDescription('Reason for mute')

    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const user = interaction.options.get('user')?.user;
    const durationStr = interaction.options.get('duration')?.value as string;
    const reason = (interaction.options.get('reason')?.value as string) || 'No reason provided';

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
    if (!member || !member.moderatable) {
      await interaction.editReply({ content: '❌ I cannot mute this user.' });
      return;
    }

    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      await interaction.editReply({ content: '❌ Invalid duration format. Use e.g. 10m, 1h, 1d' });
      return;
    }

    try {
      const existing = db.prepare('SELECT * FROM muted_users WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, user.id);
      if (existing) {
        await interaction.editReply({ content: t(lang, 'moderation.already_muted') });
        return;
      }

      await member.timeout(durationMs, reason);

      const unmuteAt = new Date(Date.now() + durationMs).toISOString();
      db.prepare(
        'INSERT INTO muted_users (guild_id, user_id, unmute_at) VALUES (?, ?, ?)'
      ).run(interaction.guildId, user.id, unmuteAt);

      await user.send({
        content: t(lang, 'moderation.dm_muted', { guild: interaction.guild!.name, duration: durationStr, reason })
      }).catch(() => {});

      await interaction.editReply({ content: t(lang, 'moderation.muted', { user: user.tag, duration: durationStr }) });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to mute user: ${error}` });
    }
  },
};

export = command;
