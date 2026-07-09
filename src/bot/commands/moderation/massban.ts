import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('massban')
    .setDescription('Ban multiple users')
    .addStringOption(option => option.setName('users').setDescription('User IDs separated by spaces').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason').setRequired(false)),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const usersStr = interaction.options.get('users')?.value as string;
    const reason = (interaction.options.get('reason')?.value as string) || 'Mass ban';
    const userIds = usersStr.split(/\s+/).filter(id => /^\d+$/.test(id));

    if (userIds.length === 0) {
      await interaction.reply({ content: '❌ No valid user IDs provided.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    let banned = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of userIds.slice(0, 25)) {
      try {
        const user = await interaction.client.users.fetch(id);
        await interaction.guild!.members.ban(user, { reason });
        banned++;
      } catch (err: any) {
        failed++;
        errors.push(`${id}: ${err.message || 'Unknown error'}`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🔨 Mass Ban Results')
      .addFields(
        { name: 'Banned', value: `${banned}`, inline: true },
        { name: 'Failed', value: `${failed}`, inline: true }
      )
      .setColor(0xe74c3c)
      .setTimestamp();

    if (errors.length > 0) {
      embed.addFields({ name: 'Errors', value: errors.join('\n').substring(0, 1024) });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export = command;
