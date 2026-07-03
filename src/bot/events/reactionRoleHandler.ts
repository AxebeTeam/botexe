import { Client, MessageReaction, User } from 'discord.js';
import db from '../../database/connection';
import { logger } from '../../utils/logger';

export function handleReactionRoles(client: Client): void {
  client.on('messageReactionAdd', async (reaction: MessageReaction, user: User) => {
    try {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
      if (!reaction.message.guildId) return;

      let emoji = reaction.emoji.toString();
      if (reaction.emoji.id) {
        emoji = `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>`;
      }

      const row = db.prepare(
        'SELECT role_id FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND (emoji = ? OR emoji = ?)'
      ).get(reaction.message.guildId, reaction.message.id, reaction.emoji.toString(), emoji) as any;

      if (!row) return;

      const member = await reaction.message.guild?.members.fetch(user.id).catch(() => null);
      if (!member) return;

      await member.roles.add(row.role_id);
      logger.bot(`Added role ${row.role_id} to ${user.tag} via reaction`);
    } catch (error) {
      logger.error(`Reaction role add error: ${error}`);
    }
  });

  client.on('messageReactionRemove', async (reaction: MessageReaction, user: User) => {
    try {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
      if (!reaction.message.guildId) return;

      let emoji = reaction.emoji.toString();
      if (reaction.emoji.id) {
        emoji = `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>`;
      }

      const row = db.prepare(
        'SELECT role_id FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND (emoji = ? OR emoji = ?)'
      ).get(reaction.message.guildId, reaction.message.id, reaction.emoji.toString(), emoji) as any;

      if (!row) return;

      const member = await reaction.message.guild?.members.fetch(user.id).catch(() => null);
      if (!member) return;

      await member.roles.remove(row.role_id);
      logger.bot(`Removed role ${row.role_id} from ${user.tag} via reaction`);
    } catch (error) {
      logger.error(`Reaction role remove error: ${error}`);
    }
  });
}
