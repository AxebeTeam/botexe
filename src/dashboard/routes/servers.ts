import { Router, Request, Response } from 'express';
import { requireAuth } from './auth';
import db from '../../database/connection';
import { logger } from '../../utils/logger';

export const serversRouter = Router();

let _getClient: (() => any) | null = null;
export function setClientGetter(fn: () => any) {
  _getClient = fn;
}

serversRouter.use(requireAuth);

serversRouter.get('/', (req: Request, res: Response) => {
  const guilds = db.prepare('SELECT * FROM guilds ORDER BY joined_at DESC').all() as any[];
  const client = _getClient ? _getClient() : null;
  const availableKeys = db.prepare('SELECT * FROM keys WHERE is_active = 0 AND guild_id IS NULL ORDER BY created_at DESC').all() as any[];

  const guildsWithInfo = guilds.map(g => {
    const key = db.prepare('SELECT * FROM keys WHERE guild_id = ?').get(g.guild_id) as any;
    const warnCount = (db.prepare('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ?').get(g.guild_id) as any).count;
    const discordGuild = client?.guilds.cache.get(g.guild_id);
    const owner = g.owner_id ? client?.users.cache.get(g.owner_id) : null;

    return {
      ...g,
      name: discordGuild?.name || g.guild_name,
      icon: discordGuild?.iconURL() || null,
      member_count: discordGuild?.memberCount || 0,
      owner_tag: owner?.tag || g.owner_id,
      has_key: !!(key && key.is_active && key.expires_at && Date.now() < new Date(key.expires_at).getTime()),
      key_id: key?.id || null,
      key_key: key?.key || null,
      key_expires: key?.expires_at || null,
      key_expired: key?.expires_at ? Date.now() > new Date(key.expires_at).getTime() : false,
      warnings_count: warnCount,
      days_left: key?.expires_at ? Math.max(0, Math.floor((new Date(key.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
    };
  });

  res.render('servers', {
    title: 'Server Management',
    guilds: guildsWithInfo,
    availableKeys,
    query: req.query,
    clientId: process.env.CLIENT_ID || '',
  });
});

serversRouter.post('/assign-key', (req: Request, res: Response) => {
  const guild_id = String(req.body.guild_id);
  const key_id = String(req.body.key_id);
  const days = parseInt(String(req.body.days)) || 30;

  if (!guild_id || !key_id) {
    return res.redirect('/servers?error=missing_fields');
  }

  const key = db.prepare('SELECT * FROM keys WHERE id = ? AND is_active = 0 AND guild_id IS NULL').get(key_id) as any;
  if (!key) {
    return res.redirect('/servers?error=invalid_key');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  db.prepare(
    `UPDATE keys SET guild_id = ?, activated_by = ?, activated_at = datetime('now'), expires_at = ?, is_active = 1 WHERE id = ?`
  ).run(guild_id, 'dashboard', expiresAt.toISOString(), key_id);

  res.redirect('/servers?success=key_assigned');
});

serversRouter.post('/remove/:guildId', (req: Request, res: Response) => {
  const guildId = req.params.guildId;
  db.prepare('UPDATE keys SET guild_id = NULL, is_active = 0 WHERE guild_id = ?').run(guildId);
  db.prepare('DELETE FROM guilds WHERE guild_id = ?').run(guildId);
  res.redirect('/servers');
});

serversRouter.post('/deactivate-key/:guildId', (req: Request, res: Response) => {
  const guildId = req.params.guildId;
  db.prepare('UPDATE keys SET guild_id = NULL, is_active = 0 WHERE guild_id = ?').run(guildId);
  res.redirect('/servers');
});

serversRouter.post('/extend-key/:guildId', (req: Request, res: Response) => {
  const guildId = req.params.guildId;
  const days = parseInt(String(req.body.days)) || 30;

  const key = db.prepare('SELECT * FROM keys WHERE guild_id = ? AND is_active = 1').get(guildId) as any;
  if (key) {
    const currentExpires = key.expires_at ? new Date(key.expires_at) : new Date();
    currentExpires.setDate(currentExpires.getDate() + days);
    db.prepare('UPDATE keys SET expires_at = ? WHERE guild_id = ?').run(currentExpires.toISOString(), guildId);
  }

  res.redirect('/servers');
});

serversRouter.post('/leave/:guildId', async (req: Request, res: Response) => {
  const guildId = req.params.guildId;
  const client = _getClient ? _getClient() : null;

  if (client) {
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      try {
        await guild.leave();
        logger.info(`Bot left guild: ${guild.name} (${guildId})`);
        db.prepare('UPDATE keys SET guild_id = NULL, is_active = 0 WHERE guild_id = ?').run(guildId);
        db.prepare('DELETE FROM guilds WHERE guild_id = ?').run(guildId);
        return res.redirect('/servers?success=left');
      } catch (err) {
        logger.error(`Failed to leave guild: ${err}`);
        return res.redirect('/servers?error=leave_failed');
      }
    }
  }

  db.prepare('UPDATE keys SET guild_id = NULL, is_active = 0 WHERE guild_id = ?').run(guildId);
  db.prepare('DELETE FROM guilds WHERE guild_id = ?').run(guildId);
  res.redirect('/servers?error=guild_not_found');
});

serversRouter.get('/lookup', (req: Request, res: Response) => {
  const userId = String(req.query.user_id || '');
  const client = _getClient ? _getClient() : null;
  let userInfo = null;
  let userGuilds: any[] = [];

  if (userId && client) {
    const user = client.users.cache.get(userId);
    if (user) {
      const memberGuilds: any[] = [];
      client.guilds.cache.forEach(g => {
        const member = g.members.cache.get(userId);
        if (member) {
          memberGuilds.push({
            id: g.id,
            name: g.name,
            icon: g.iconURL(),
            isOwner: g.ownerId === userId,
            joinedAt: member.joinedAt,
          });
        }
      });

      userInfo = {
        id: user.id,
        tag: user.tag,
        avatar: user.displayAvatarURL(),
        bot: user.bot,
        createdAt: user.createdAt,
      };
      userGuilds = memberGuilds;
    }
  }

  res.render('lookup', {
    title: 'User Lookup',
    query: req.query,
    userInfo,
    userGuilds,
    userId,
  });
});
