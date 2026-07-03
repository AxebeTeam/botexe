import { Client, Guild } from 'discord.js';
import { logger } from '../../utils/logger';
import db from '../../database/connection';

export function handleGuildDelete(client: Client): void {
  client.on('guildDelete', async (guild: Guild) => {
    logger.bot(`Left guild: ${guild.name} (${guild.id})`);

    try {
      const key = db.prepare('SELECT * FROM keys WHERE guild_id = ?').get(guild.id) as any;
      if (key) {
        db.prepare('UPDATE keys SET guild_id = NULL, is_active = 0 WHERE guild_id = ?').run(guild.id);
        logger.bot(`Deactivated key for guild: ${guild.name}`);
      }

      db.prepare('DELETE FROM guilds WHERE guild_id = ?').run(guild.id);
      logger.success(`Removed guild from database: ${guild.name}`);
    } catch (error) {
      logger.error(`Error removing guild from database: ${error}`);
    }
  });
}
