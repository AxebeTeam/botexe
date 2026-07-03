import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')

    .addUserOption(option =>
      option.setName('user')

        .setDescription('The user to ban')

        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')

        .setDescription('Reason for ban')

    )
    .addIntegerOption(option =>
      option.setName('days')

        .setDescription('Delete messages from the last X days')

        .setMinValue(0)
        .setMaxValue(7)
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const user = interaction.options.get('user')?.user;
    const reason = (interaction.options.get('reason')?.value as string) || 'No reason provided';
    const days = (interaction.options.get('days')?.value as number) || 0;

    await interaction.deferReply();

    if (!user) {
      await interaction.editReply({ content: t(lang, 'common.invalid_user') });
      return;
    }

    const member = interaction.guild!.members.cache.get(user.id);
    if (member && !member.bannable) {
      await interaction.editReply({ content: '❌ I cannot ban this user.' });
      return;
    }

    try {
      await user.send({ content: t(lang, 'moderation.dm_banned', { guild: interaction.guild!.name, reason }) }).catch(() => {});
      await interaction.guild!.members.ban(user, { reason, deleteMessageSeconds: days * 86400 });
      await interaction.editReply({ content: t(lang, 'moderation.banned', { user: user.tag, reason }) });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to ban user: ${error}` });
    }
  },
};

export = command;
