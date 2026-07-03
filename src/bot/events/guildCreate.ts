import { Client, Guild } from 'discord.js';
import { logger } from '../../utils/logger';
import { syncGuild } from '../handlers/commandHandler';
import db from '../../database/connection';

export function handleGuildCreate(client: Client): void {
  client.on('guildCreate', async (guild: Guild) => {
    logger.bot(`Joined guild: ${guild.name} (${guild.id})`);

    try {
      const existing = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guild.id);
      if (!existing) {
        db.prepare(
          'INSERT INTO guilds (guild_id, guild_name, owner_id) VALUES (?, ?, ?)'
        ).run(guild.id, guild.name, guild.ownerId);
        logger.success(`Added guild to database: ${guild.name}`);
      }

      await syncGuild(guild.id);
      logger.success(`Commands synced to new guild: ${guild.name}`);
    } catch (error) {
      logger.error(`Error in guildCreate: ${error}`);
    }
  });
}
