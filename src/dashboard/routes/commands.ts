import { Router, Request, Response } from 'express';
import { requireAuth } from './auth';
import { getBotClient } from '../index';
import { reloadAndSync, reloadCommandsFromDisk, clearGlobalCommands } from '../../bot/handlers/commandHandler';
import { logger } from '../../utils/logger';
import db from '../../database/connection';
import { EmbedBuilder } from 'discord.js';

export const commandsRouter = Router();

commandsRouter.use(requireAuth);

commandsRouter.get('/', (req: Request, res: Response) => {
  res.render('commands', {
    title: 'Commands Manager',
    query: req.query,
  });
});

commandsRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const client = getBotClient();
    if (!client || !client.user) {
      return res.redirect('/commands?error=no_client');
    }

    const guildIds = client.guilds.cache.map(g => g.id);
    const result = await reloadAndSync(guildIds);

    if (result.errors.length > 0) {
      logger.error(`Sync had errors: ${result.errors.join(', ')}`);
    }

    res.redirect(`/commands?success=synced&guildCount=${guildIds.length}&guilds=${result.guilds}`);
  } catch (err: any) {
    logger.error(`Dashboard command sync error: ${err}`);
    res.redirect(`/commands?error=sync_failed&msg=${encodeURIComponent(err.message || String(err))}`);
  }
});

commandsRouter.post('/fix-duplicates', async (req: Request, res: Response) => {
  try {
    const client = getBotClient();
    if (!client || !client.user) {
      return res.redirect('/commands?error=no_client');
    }

    const clearResult = await clearGlobalCommands();
    if (!clearResult.success) {
      return res.redirect(`/commands?error=sync_failed&msg=${encodeURIComponent(clearResult.error || 'Clear failed')}`);
    }

    const guildIds = client.guilds.cache.map(g => g.id);
    for (const gId of guildIds) {
      await new Promise(r => setTimeout(r, 300));
    }

    const result = await reloadAndSync(guildIds);
    logger.success(`Fixed duplicates: re-synced ${result.guilds} guild commands`);

    res.redirect(`/commands?success=synced&msg=Duplicates+fixed!+Re-synced+${result.guilds}+commands+across+${guildIds.length}+guilds`);
  } catch (err: any) {
    logger.error(`Fix duplicates error: ${err}`);
    res.redirect(`/commands?error=sync_failed&msg=${encodeURIComponent(err.message || String(err))}`);
  }
});

commandsRouter.post('/reload', async (req: Request, res: Response) => {
  try {
    const count = reloadCommandsFromDisk();
    if (count === 0) {
      return res.redirect('/commands?error=no_commands');
    }
    res.redirect('/commands?success=reloaded&count=' + count);
  } catch (err: any) {
    logger.error(`Command reload error: ${err}`);
    res.redirect('/commands?error=reload_failed');
  }
});

commandsRouter.post('/broadcast', async (req: Request, res: Response) => {
  const message = String(req.body.message || '').trim();
  if (!message) {
    return res.redirect('/commands?error=no_message');
  }

  try {
    const client = getBotClient();
    if (!client) {
      return res.redirect('/commands?error=no_client');
    }

    const guilds = db.prepare('SELECT guild_id FROM guilds').all() as any[];
    let sent = 0;
    let failed = 0;

    const embed = new EmbedBuilder()
      .setTitle('Broadcast')
      .setDescription(message)
      .setColor(0x0099ff)
      .setTimestamp();

    for (const g of guilds) {
      try {
        const guild = client.guilds.cache.get(g.guild_id);
        if (guild) {
          const channel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased());
          if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] });
            sent++;
          }
        }
      } catch {
        failed++;
      }
    }

    res.redirect(`/commands?success=broadcast&sent=${sent}&failed=${failed}`);
  } catch (err) {
    logger.error(`Dashboard broadcast failed: ${err}`);
    res.redirect('/commands?error=broadcast_failed');
  }
});
