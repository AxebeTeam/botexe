import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel')
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for unlocking').setRequired(false)
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const reason = (interaction.options.get('reason')?.value as string) || 'No reason provided';
    const channel = interaction.channel;

    if (!channel || !('permissionOverwrites' in channel)) {
      await interaction.reply({ content: '❌ Cannot unlock this channel.', ephemeral: true });
      return;
    }

    await (channel as any).permissionOverwrites.edit(interaction.guild!.roles.everyone, {
      SendMessages: null,
    }, { reason: `Unlocked by ${interaction.user.tag}: ${reason}` });

    await interaction.reply({ content: `🔓 Channel unlocked. Reason: ${reason}` });
  },
};

export = command;
