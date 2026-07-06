import { Client, Message, TextChannel, EmbedBuilder } from 'discord.js';
import db from '../../database/connection';

const recentMessages = new Map<string, { content: string; count: number; lastTime: number }>();
const userViolations = new Map<string, { count: number; lastTime: number }>();

// Detect Zalgo text
function hasZalgo(text: string): boolean {
  const zalgoRegex = /[\u0300-\u036f\u0489\u048a\u0488\u048b\u20d0-\u20ff\u0610-\u061a\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0660-\u0669]/;
  const zalgoCount = (text.match(zalgoRegex) || []).length;
  return zalgoCount > Math.floor(text.length * 0.15) && text.length > 2;
}

// Detect invite links
function hasInviteLink(text: string): boolean {
  const inviteRegex = /(discord\.gg|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
  return inviteRegex.test(text);
}

// Detect URL shorteners
function hasShortenedUrl(text: string): boolean {
  const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'shorturl.at', 'cutt.ly', 'rb.gy', 'shorturl.do'];
  const lower = text.toLowerCase();
  return shorteners.some(s => lower.includes(s));
}

// Detect mass mentions
function hasMassMentions(text: string): boolean {
  const mentionRegex = /<@!?\d+>/g;
  const mentions = text.match(mentionRegex) || [];
  return mentions.length >= 5;
}

// Detect mass emojis (custom + unicode)
function hasMassEmojis(text: string): boolean {
  const customEmoji = /<a?:\w+:\d+>/g;
  const unicodeEmoji = /[\u{1F600}-\u{1F9FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const custom = (text.match(customEmoji) || []).length;
  const unicode = (text.match(unicodeEmoji) || []).length;
  return (custom + unicode) > 8;
}

// Detect repeated characters (e.g. "aaaaaaa", "!!!!!!!")
function hasRepeatedChars(text: string): boolean {
  const repeatRegex = /(.)\1{7,}/g;
  return repeatRegex.test(text);
}

export function handleAutoModMessage(client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (!message.guildId || !message.member) return;
    if (!message.inGuild()) return;

    const guildId = message.guildId;

    // Check protection config too
    const protection = db.prepare('SELECT * FROM protection_config WHERE guild_id = ?').get(guildId) as any;
    const settings = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guildId) as any;
    if (!settings && !protection) return;

    const member = message.member;
    const ignoredRoles: string[] = JSON.parse(settings?.ignored_roles || protection?.bypass_roles || '[]');
    const hasIgnoredRole = member.roles.cache.some(r => ignoredRoles.includes(r.id));
    if (hasIgnoredRole) return;

    const violations: string[] = [];

    // Anti-spam (same message repeated)
    if (settings?.anti_spam || protection?.anti_spam) {
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

      // Rapid fire detection (different messages, same user)
      const rapidKey = `${guildId}:${message.author.id}:rapid`;
      const rapidRecord = recentMessages.get(rapidKey);
      if (rapidRecord) {
        const timeDiff = now - rapidRecord.lastTime;
        if (timeDiff < 2000) {
          rapidRecord.count++;
          rapidRecord.lastTime = now;
          if (rapidRecord.count >= 8) {
            violations.push('Rapid fire spam detected');
            recentMessages.delete(rapidKey);
          }
        } else {
          recentMessages.set(rapidKey, { content: 'rapid', count: 1, lastTime: now });
          setTimeout(() => recentMessages.delete(rapidKey), 5000);
        }
      } else {
        recentMessages.set(rapidKey, { content: 'rapid', count: 1, lastTime: now });
        setTimeout(() => recentMessages.delete(rapidKey), 5000);
      }
    }

    // Anti-links
    if (settings?.anti_links || protection?.anti_links) {
      const urlRegex = /https?:\/\/[^\s]+/gi;
      if (urlRegex.test(message.content)) {
        if (hasInviteLink(message.content)) {
          violations.push('Invite link detected');
        } else {
          violations.push('Links are not allowed');
        }
      }
      if (hasInviteLink(message.content)) {
        violations.push('Discord invite link detected');
      }
    }

    // Anti-caps
    if (settings?.anti_caps || protection?.anti_caps) {
      if (message.content.length > 10) {
        const capsCount = (message.content.match(/[A-Z]/g) || []).length;
        const totalLetters = (message.content.match(/[A-Za-z]/g) || []).length;
        if (totalLetters > 0 && (capsCount / totalLetters) > 0.7) {
          violations.push('Excessive caps detected');
        }
      }
    }

    // Bad words
    if (settings?.bad_words) {
      const badWords: string[] = JSON.parse(settings.bad_words || '[]');
      if (badWords.length > 0) {
        const lowerContent = message.content.toLowerCase();
        const found = badWords.some(w => lowerContent.includes(w));
        if (found) {
          violations.push('Inappropriate language detected');
        }
      }
    }

    // Zalgo detection (always on if automod enabled)
    if (hasZalgo(message.content)) {
      violations.push('Zalgo text detected');
    }

    // URL shortener detection
    if (hasShortenedUrl(message.content)) {
      violations.push('URL shortener detected');
    }

    // Mass mentions
    if (hasMassMentions(message.content)) {
      violations.push('Mass mentions detected');
    }

    // Mass emojis
    if (hasMassEmojis(message.content)) {
      violations.push('Mass emojis detected');
    }

    // Repeated characters
    if (hasRepeatedChars(message.content)) {
      violations.push('Excessive repeated characters');
    }

    // Anti-raid (mass joins)
    if (protection?.anti_raid) {
      const raidKey = `${guildId}:raid`;
      const now = Date.now();
      const raidRecord = userViolations.get(raidKey);
      if (raidRecord) {
        const timeDiff = now - raidRecord.lastTime;
        if (timeDiff < 60000) { // Within 1 minute
          raidRecord.count++;
          raidRecord.lastTime = now;
          if (raidRecord.count >= (protection.raid_limit || 10)) {
            violations.push('Raid detected');
            userViolations.delete(raidKey);
          }
        } else {
          userViolations.set(raidKey, { count: 1, lastTime: now });
        }
      } else {
        userViolations.set(raidKey, { count: 1, lastTime: now });
      }
    }

    if (violations.length === 0) return;

    try {
      await message.delete();
    } catch {
      return;
    }

    const reason = violations.join(', ');

    // Punishment system
    const punishment = protection?.punishment || settings?.punishment || 'warn';

    try {
      if (punishment === 'mute') {
        const muteDuration = 5 * 60 * 1000; // 5 minutes
        const muteRole = message.guild?.roles.cache.find(r => r.name.toLowerCase() === 'muted');
        if (muteRole) {
          await member.roles.add(muteRole);
          db.prepare('INSERT OR REPLACE INTO muted_users (guild_id, user_id, role_id, muted_at, unmute_at) VALUES (?, ?, ?, datetime("now"), ?)').run(
            guildId, member.id, muteRole.id, new Date(Date.now() + muteDuration).toISOString()
          );
          setTimeout(async () => {
            const m = await message.guild?.members.fetch(member.id).catch(() => null);
            if (m) await m.roles.remove(muteRole).catch(() => {});
            db.prepare('DELETE FROM muted_users WHERE guild_id = ? AND user_id = ?').run(guildId, member.id);
          }, muteDuration);
        }
      }

      const dmEmbed = new EmbedBuilder()
        .setTitle('🛡️ AutoMod')
        .setDescription(`Your message in **${message.guild?.name}** was deleted.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Punishment', value: punishment },
          { name: 'Message', value: message.content.substring(0, 1000) || '[No content]' }
        )
        .setColor(0xe74c3c)
        .setTimestamp();
      await message.author.send({ embeds: [dmEmbed] }).catch(() => {});
    } catch {
      // DM failed
    }

    if (settings?.log_channel) {
      const logChannel = message.guild?.channels.cache.get(settings.log_channel) as TextChannel | undefined;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🛡️ AutoMod - Message Removed')
          .setDescription(`${message.author} (${message.author.id})`)
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
