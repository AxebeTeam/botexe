import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a user')
    .addUserOption(option => option.setName('user').setDescription('User to tempban').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in hours').setRequired(true).setMinValue(1).setMaxValue(720))
    .addStringOption(option => option.setName('reason').setDescription('Reason').setRequired(false)),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user')!;
    const duration = interaction.options.get('duration')?.value as number;
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

    const unbanTime = new Date(Date.now() + duration * 3600000).toISOString();

    await member.send({ content: `🔨 You have been banned from **${interaction.guild!.name}** for ${duration} hour(s).\nReason: ${reason}` }).catch(() => {});
    await interaction.guild!.members.ban(user, { reason: `Tempban: ${reason}` });

    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(
      `tempban_${interaction.guildId}_${user.id}`,
      JSON.stringify({ unbanAt: unbanTime, reason })
    );

    setTimeout(async () => {
      try {
        await interaction.guild?.members.unban(user.id, 'Tempban expired');
        db.prepare('DELETE FROM config WHERE key = ?').run(`tempban_${interaction.guildId}_${user.id}`);
      } catch {}
    }, duration * 3600000);

    const embed = new EmbedBuilder()
      .setTitle('🔨 Tempban')
      .setDescription(`**${user.tag}** has been banned for **${duration}h**`)
      .addFields({ name: 'Reason', value: reason })
      .setColor(0xe74c3c)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
