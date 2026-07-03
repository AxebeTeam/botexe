import { Client, MessageReaction, User } from 'discord.js';
import db from '../../database/connection';

export function handleSuggestionVotes(client: Client): void {
  client.on('messageReactionAdd', async (reaction: MessageReaction, user: User) => {
    try {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
      if (!reaction.message.guildId) return;

      const suggestion = db.prepare(
        'SELECT * FROM suggestions WHERE guild_id = ? AND message_id = ? AND channel_id = ?'
      ).get(reaction.message.guildId, reaction.message.id, reaction.message.channelId) as any;

      if (!suggestion) return;

      if (reaction.emoji.name === '✅') {
        db.prepare('UPDATE suggestions SET upvotes = upvotes + 1 WHERE id = ?').run(suggestion.id);
      } else if (reaction.emoji.name === '❌') {
        db.prepare('UPDATE suggestions SET downvotes = downvotes + 1 WHERE id = ?').run(suggestion.id);
      }
    } catch {}
  });

  client.on('messageReactionRemove', async (reaction: MessageReaction, user: User) => {
    try {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
      if (!reaction.message.guildId) return;

      const suggestion = db.prepare(
        'SELECT * FROM suggestions WHERE guild_id = ? AND message_id = ? AND channel_id = ?'
      ).get(reaction.message.guildId, reaction.message.id, reaction.message.channelId) as any;

      if (!suggestion) return;

      if (reaction.emoji.name === '✅') {
        db.prepare('UPDATE suggestions SET upvotes = CASE WHEN upvotes > 0 THEN upvotes - 1 ELSE 0 END WHERE id = ?').run(suggestion.id);
      } else if (reaction.emoji.name === '❌') {
        db.prepare('UPDATE suggestions SET downvotes = CASE WHEN downvotes > 0 THEN downvotes - 1 ELSE 0 END WHERE id = ?').run(suggestion.id);
      }
    } catch {}
  });
}
