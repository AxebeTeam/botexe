import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and unban to delete messages')
    .addUserOption(option => option.setName('user').setDescription('User to softban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason').setRequired(false)),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user')!;
    const reason = (interaction.options.get('reason')?.value as string) || 'No reason provided';

    const member = await interaction.guild?.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: '❌ User not found.', ephemeral: true });
      return;
    }
    if (!member.bannable) {
      await interaction.reply({ content: '❌ I cannot ban this user.', ephemeral: true });
      return;
    }

    try {
      await interaction.guild!.members.ban(user, { deleteMessageSeconds: 7 * 86400, reason: `Softban: ${reason}` });
      await interaction.guild!.members.unban(user.id, 'Softban - unban');
      await interaction.reply({ content: `✅ Softbanned **${user.tag}**. Messages deleted. Reason: ${reason}` });
    } catch (error) {
      await interaction.reply({ content: `❌ Failed: ${error}` });
    }
  },
};

export = command;
