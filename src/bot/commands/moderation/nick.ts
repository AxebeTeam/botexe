import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Change a member\'s nickname')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to change nickname').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('nickname').setDescription('New nickname (leave empty to reset)').setRequired(false)
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.get('user')?.user;
    const nickname = interaction.options.get('nickname')?.value as string | undefined;

    if (!user) {
      await interaction.reply({ content: '❌ User not found.', ephemeral: true });
      return;
    }

    const member = await interaction.guild?.members.fetch(user.id);
    if (!member) {
      await interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
      return;
    }

    if (!member.manageable) {
      await interaction.reply({ content: '❌ I cannot change this member\'s nickname.', ephemeral: true });
      return;
    }

    await member.setNickname(nickname || null, `Changed by ${interaction.user.tag}`);
    await interaction.reply({ content: `✅ Nickname changed for **${user.tag}** to: **${nickname || 'reset'}**` });
  },
};

export = command;
