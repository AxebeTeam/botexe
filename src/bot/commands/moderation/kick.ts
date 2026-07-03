import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')

    .addUserOption(option =>
      option.setName('user')

        .setDescription('The user to kick')

        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')

        .setDescription('Reason for kick')

    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const user = interaction.options.get('user')?.user;
    const reason = (interaction.options.get('reason')?.value as string) || 'No reason provided';

    await interaction.deferReply();

    if (!user) {
      await interaction.editReply({ content: t(lang, 'common.invalid_user') });
      return;
    }

    const member = interaction.guild!.members.cache.get(user.id);
    if (!member) {
      await interaction.editReply({ content: t(lang, 'common.invalid_user') });
      return;
    }

    if (!member.kickable) {
      await interaction.editReply({ content: '❌ I cannot kick this user.' });
      return;
    }

    try {
      await user.send({ content: t(lang, 'moderation.dm_kicked', { guild: interaction.guild!.name, reason }) }).catch(() => {});
      await member.kick(reason);
      await interaction.editReply({ content: t(lang, 'moderation.kicked', { user: user.tag, reason }) });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to kick user: ${error}` });
    }
  },
};

export = command;
