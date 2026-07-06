import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import db from '../../database/connection';

export function handleMessageLogs(client: Client): void {
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (oldMessage.author?.bot) return;
    if (!oldMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;

    const config = db.prepare('SELECT * FROM logging_config WHERE guild_id = ?').get(oldMessage.guild.id) as any;
    if (!config || !config.message_logs || !config.log_channel) return;

    const channel = oldMessage.guild.channels.cache.get(config.log_channel) as TextChannel;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Message Edited')
      .setColor(0xf39c12)
      .addFields(
        { name: 'User', value: `${oldMessage.author.tag} (${oldMessage.author.id})`, inline: true },
        { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
        { name: 'Before', value: oldMessage.content.substring(0, 1024) || '[empty]' },
        { name: 'After', value: newMessage.content.substring(0, 1024) || '[empty]' }
      )
      .setTimestamp()
      .setFooter({ text: `Message ID: ${oldMessage.id}` });

    await channel.send({ embeds: [embed] }).catch(() => {});
  });

  client.on('messageDelete', async (message) => {
    if (message.author?.bot) return;
    if (!message.guild) return;

    const config = db.prepare('SELECT * FROM logging_config WHERE guild_id = ?').get(message.guild.id) as any;
    if (!config || !config.message_logs || !config.log_channel) return;

    const channel = message.guild.channels.cache.get(config.log_channel) as TextChannel;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Message Deleted')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Content', value: message.content.substring(0, 1024) || '[No text content]' }
      )
      .setTimestamp()
      .setFooter({ text: `Message ID: ${message.id}` });

    if (message.attachments.size > 0) {
      embed.addFields({ name: 'Attachments', value: message.attachments.map(a => a.name).join(', ') });
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  });
}
