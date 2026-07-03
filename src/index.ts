import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase } from './database';
import { startBot } from './bot';
import { startDashboard } from './dashboard';
import { logger } from './utils/logger';

async function main() {
  logger.info('Starting MPBot System...');
  console.log('');
  console.log('  ╔══════════════════════════════════╗');
  console.log('  ║     Multi-Purpose Bot System      ║');
  console.log('  ║       MPBot v1.0.0                ║');
  console.log('  ╚══════════════════════════════════╝');
  console.log('');

  initializeDatabase();
  logger.success('Database initialized');

  const client = await startBot();

  startDashboard(client);
  logger.info('Dashboard starting...');
}

main().catch((error) => {
  logger.error(`Fatal error: ${error}`);
  process.exit(1);
});
