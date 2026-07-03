import { Client, ActivityType } from 'discord.js';
import { logger } from '../../utils/logger';

export function handleReady(client: Client): void {
  client.once('clientReady', () => {
    logger.success(`Logged in as ${client.user?.tag}!`);

    const statuses = [
      { name: '/help | Multi-Purpose Bot', type: ActivityType.Playing },
      { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
      { name: 'MPBot System', type: ActivityType.Playing },
    ];

    let index = 0;
    setInterval(() => {
      const status = statuses[index];
      client.user?.setActivity(status.name, { type: status.type });
      index = (index + 1) % statuses.length;
    }, 10000);
  });
}
