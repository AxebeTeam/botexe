import { Client, Message, TextChannel, EmbedBuilder } from 'discord.js';
import db from '../../database/connection';

const recentMessages = new Map<string, { content: string; count: number; lastTime: number }>();

export function handleAutoModMessage(client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (!message.guildId || !message.member) return;
    if (!message.inGuild()) return;

    const guildId = message.guildId;

    const settings = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guildId) as any;
    if (!settings) return;

    const member = message.member;
    const ignoredRoles: string[] = JSON.parse(settings.ignored_roles || '[]');
    const hasIgnoredRole = member.roles.cache.some(r => ignoredRoles.includes(r.id));
    if (hasIgnoredRole) return;

    const violations: string[] = [];

    if (settings.anti_spam) {
      const key = `${guildId}:${message.author.id}`;
      const now = Date.now();
      const record = recentMessages.get(key);

      if (record && record.content === message.content && now - record.lastTime < 8000) {
        record.count++;
        record.lastTime = now;
        if (record.count >= 3) {
          violations.push('Spam detected: repeated message');
          recentMessages.delete(key);
        }
      } else {
        recentMessages.set(key, { content: message.content, count: 1, lastTime: now });
        setTimeout(() => recentMessages.delete(key), 10000);
      }
    }

    if (settings.anti_links) {
      const urlRegex = /https?:\/\/[^\s]+/gi;
      if (urlRegex.test(message.content)) {
        violations.push('Links are not allowed');
      }
    }

    if (settings.anti_caps) {
      if (message.content.length > 10) {
        const capsCount = (message.content.match(/[A-Z]/g) || []).length;
        const totalLetters = (message.content.match(/[A-Za-z]/g) || []).length;
        if (totalLetters > 0 && (capsCount / totalLetters) > 0.7) {
          violations.push('Excessive caps detected');
        }
      }
    }

    if (settings.bad_words) {
      const badWords: string[] = JSON.parse(settings.bad_words || '[]');
      if (badWords.length > 0) {
        const lowerContent = message.content.toLowerCase();
        const found = badWords.some(w => lowerContent.includes(w));
        if (found) {
          violations.push('Inappropriate language detected');
        }
      }
    }

    if (violations.length === 0) return;

    try {
      await message.delete();
    } catch {
      return;
    }

    const reason = violations.join(', ');

    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('AutoMod - Message Deleted')
        .setDescription(`Your message in **${message.guild?.name}** was deleted.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Message', value: message.content.substring(0, 1000) || '[No content]' }
        )
        .setColor(0xe74c3c)
        .setTimestamp();
      await message.author.send({ embeds: [dmEmbed] }).catch(() => {});
    } catch {
      // DM failed, ignore
    }

    if (settings.log_channel) {
      const logChannel = message.guild?.channels.cache.get(settings.log_channel) as TextChannel | undefined;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('AutoMod - Message Removed')
          .setDescription(`A message from ${message.author} was removed.`)
          .addFields(
            { name: 'Channel', value: `<#${message.channelId}>` },
            { name: 'Reason', value: reason },
            { name: 'Content', value: message.content.substring(0, 1000) || '[No content]' }
          )
          .setColor(0xe74c3c)
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }
  });
}
