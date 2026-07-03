import dotenv from 'dotenv';
dotenv.config();

import { loadCommands, getCommands, syncGuild, clearGlobalCommands } from './commandHandler';
import { REST } from 'discord.js';
import { logger } from '../../utils/logger';

async function main() {
  loadCommands();
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    logger.error('CLIENT_ID not set in .env');
    process.exit(1);
  }

  logger.info('Global registration disabled — using guild-only registration.');
  logger.info('Commands are automatically synced to guilds on bot startup.');
  logger.info('To sync manually, use the dashboard /commands page.');

  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);
  const globalCommands = await rest.get(`/applications/${clientId}/commands`) as any[];
  if (globalCommands.length > 0) {
    logger.warn(`Found ${globalCommands.length} global command(s). Run fix-duplicates from dashboard to remove them.`);
  }

  process.exit(0);
}

main().catch(console.error);