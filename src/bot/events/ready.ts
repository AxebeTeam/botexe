import { Client, ActivityType } from 'discord.js';
import { logger } from '../../utils/logger';

export function handleReady(client: Client): void {
  client.once('clientReady', () => {
    logger.success(`Logged in as ${client.user?.tag}!`);

    const statuses = [
      { name: '/help | EXE Bot', type: ActivityType.Playing },
      { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
      { name: `Serving ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} users`, type: ActivityType.Listening },
      { name: 'EXE Bot System', type: ActivityType.Playing },
      { name: '/poll | /remind | /afk', type: ActivityType.Listening },
    ];

    let index = 0;
    setInterval(() => {
      const status = statuses[index];
      client.user?.setActivity(status.name, { type: status.type });
      index = (index + 1) % statuses.length;
    }, 10000);

    logger.info(`Guilds: ${client.guilds.cache.size} | Users: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);
  });
}
