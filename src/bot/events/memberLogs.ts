import { Client, TextChannel, EmbedBuilder, GuildMember } from 'discord.js';
import db from '../../database/connection';

export function handleMemberLogs(client: Client): void {
  client.on('guildMemberAdd', async (member: GuildMember) => {
    const config = db.prepare('SELECT * FROM logging_config WHERE guild_id = ?').get(member.guild.id) as any;
    if (!config || !config.member_logs || !config.log_channel) return;

    const channel = member.guild.channels.cache.get(config.log_channel) as TextChannel;
    if (!channel) return;

    const accountAge = Date.now() - member.user.createdTimestamp;
    const daysOld = Math.floor(accountAge / 86400000);

    const embed = new EmbedBuilder()
      .setTitle('📥 Member Joined')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
        { name: 'Account Age', value: `${daysOld} day(s)`, inline: true },
        { name: 'Members', value: `${member.guild.memberCount}`, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  });

  client.on('guildMemberRemove', async (member: GuildMember) => {
    const config = db.prepare('SELECT * FROM logging_config WHERE guild_id = ?').get(member.guild.id) as any;
    if (!config || !config.member_logs || !config.log_channel) return;

    const channel = member.guild.channels.cache.get(config.log_channel) as TextChannel;
    if (!channel) return;

    const roles = member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .map(r => r.toString())
      .join(', ') || 'None';

    const embed = new EmbedBuilder()
      .setTitle('📤 Member Left')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
        { name: 'Roles', value: roles.substring(0, 1024) },
        { name: 'Members', value: `${member.guild.memberCount}`, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  });
}
