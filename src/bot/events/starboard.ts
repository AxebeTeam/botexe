import { Client, TextChannel, EmbedBuilder, MessageReaction, User } from 'discord.js';
import db from '../../database/connection';

export function handleStarboard(client: Client): void {
  client.on('messageReactionAdd', async (reaction: MessageReaction, user: User) => {
    if (user.bot) return;
    if (!reaction.message.guild) return;

    // Handle partial reactions
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
      try { await reaction.message.fetch(); } catch { return; }
    }

    const guild = reaction.message.guild;
    const config = db.prepare('SELECT * FROM starboard_config WHERE guild_id = ?').get(guild.id) as any;
    if (!config || !config.channel_id) return;

    const emoji = config.emoji || '⭐';
    if (reaction.emoji.name !== emoji) return;

    const count = reaction.count || 0;
    if (count < config.threshold) return;

    const existing = db.prepare('SELECT * FROM starboard WHERE guild_id = ? AND message_id = ?').get(guild.id, reaction.message.id) as any;

    const starboardChannel = guild.channels.cache.get(config.channel_id) as TextChannel;
    if (!starboardChannel) return;

    const msg = reaction.message;
    const content = msg.content || '';
    const author = msg.author;

    if (existing) {
      // Update existing starboard entry
      if (existing.starboard_message_id) {
        try {
          const starMsg = await starboardChannel.messages.fetch(existing.starboard_message_id);
          const newEmbed = EmbedBuilder.from(starMsg.embeds[0])
            .setFields(
              ...EmbedBuilder.from(starMsg.embeds[0]).data.fields || [],
            );
          // Update footer with new star count
          newEmbed.setFooter({ text: `${emoji} ${count} | ID: ${msg.id}` });
          await starMsg.edit({ embeds: [newEmbed] }).catch(() => {});
        } catch {
          // Starboard message deleted, create new one
        }
      }
      db.prepare('UPDATE starboard SET stars = ? WHERE guild_id = ? AND message_id = ?').run(count, guild.id, msg.id);
    } else {
      // Create new starboard entry
      const embed = new EmbedBuilder()
        .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() })
        .setDescription(content.substring(0, 4096) || '[No text content]')
        .setColor(0xffd700)
        .setFooter({ text: `${emoji} ${count} | ID: ${msg.id}` })
        .setTimestamp(msg.createdAt);

      if (msg.attachments.size > 0) {
        const att = msg.attachments.first();
        if (att && att.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url)) {
          embed.setImage(att.url);
        }
      }

      try {
        const sent = await starboardChannel.send({ embeds: [embed] });
        db.prepare('INSERT INTO starboard (guild_id, channel_id, message_id, starboard_message_id, stars, author_id, content) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          guild.id, msg.channel.id, msg.id, sent.id, count, author.id, content
        );
      } catch {}
    }
  });
}
