import { Router, Request, Response } from 'express';
import { getBotClient } from '../index';
import db from '../../database/connection';
import { logger } from '../../utils/logger';

export const customerRouter = Router();

const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const BASE_URL = process.env.DASHBOARD_URL || `http://localhost:${process.env.DASHBOARD_PORT || 3001}`;
const REDIRECT_URI = `${BASE_URL}/customer/callback`;

function isCustomerLoggedIn(req: Request): boolean {
  return !!(req.session as any).customer;
}

function requireCustomer(req: Request, res: Response, next: Function) {
  if (!isCustomerLoggedIn(req)) {
    return res.redirect('/customer/login');
  }
  next();
}

async function populateSidebarData(req: Request, res: Response, next: Function) {
  const customer = (req.session as any).customer;
  if (customer) {
    try {
      const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${customer.access_token}` },
      });
      const userGuilds = await guildsResponse.json() as any[];
      const client = getBotClient();
      const botGuildIds = client?.guilds.cache.map(g => g.id) || [];
      res.locals.sidebarGuilds = userGuilds.filter(g => botGuildIds.includes(g.id)).map(g => ({
        id: g.id, name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}` : null,
        memberCount: client?.guilds.cache.get(g.id)?.memberCount || 0,
        owner: g.owner,
      }));
      res.locals.allUserGuilds = userGuilds.map(g => ({
        id: g.id, name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}` : null,
        owner: g.owner,
        hasBot: botGuildIds.includes(g.id),
      }));
    } catch { res.locals.sidebarGuilds = []; res.locals.allUserGuilds = []; }
  }
  next();
}

customerRouter.get('/login', (req: Request, res: Response) => {
  if (isCustomerLoggedIn(req)) {
    return res.redirect('/customer/dashboard');
  }
  res.render('customer/login', { title: 'Customer Login', CLIENT_ID, REDIRECT_URI, query: req.query });
});

customerRouter.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    return res.redirect('/customer/login?error=no_code');
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json() as any;

    if (!tokenData.access_token) {
      logger.error(`OAuth token exchange failed: ${JSON.stringify(tokenData)}`);
      return res.redirect('/customer/login?error=token_failed');
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json() as any;

    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userGuilds = await guildsResponse.json() as any[];

    const client = getBotClient();
    const botGuildIds = client?.guilds.cache.map(g => g.id) || [];

    const mutualGuilds = userGuilds.filter(g => botGuildIds.includes(g.id)).map(g => {
      const botGuild = client?.guilds.cache.get(g.id);
      return {
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}` : null,
        owner: g.owner,
        permissions: g.permissions,
        memberCount: botGuild?.memberCount || 0,
      };
    });

    const dbGuild = db.prepare('SELECT * FROM guilds WHERE owner_id = ?').get(userData.id) as any;
    const isServerOwner = !!dbGuild;

    (req.session as any).customer = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.${userData.avatar.startsWith('a_') ? 'gif' : 'png'}`
        : null,
      global_name: userData.global_name,
      access_token: tokenData.access_token,
    };

    res.render('customer/dashboard', {
      title: 'My Dashboard',
      user: (req.session as any).customer,
      guilds: mutualGuilds,
      isServerOwner,
    });

  } catch (err) {
    logger.error(`OAuth callback error: ${err}`);
    res.redirect('/customer/login?error=callback_failed');
  }
});

customerRouter.use(requireCustomer);
customerRouter.use(populateSidebarData);

customerRouter.get('/dashboard', async (req: Request, res: Response) => {
  const customer = (req.session as any).customer;
  const guilds = res.locals.sidebarGuilds || [];

  res.render('customer/dashboard', {
    title: 'My Dashboard',
    user: customer,
    guilds,
    allGuilds: res.locals.allUserGuilds || [],
    CLIENT_ID,
    query: req.query,
  });
});

customerRouter.get('/guild/:guildId', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const client = getBotClient();

  const guild = client?.guilds.cache.get(guildId);
  if (!guild) {
    return res.status(404).send('Server not found');
  }

  const member = guild.members.cache.get(customer.id);
  const isOwner = guild.ownerId === customer.id;
  const hasAdmin = isOwner || member?.permissions.has(0x8n);

  if (!hasAdmin) {
    return res.status(403).send('You do not have permission to manage this server');
  }

  const dbData = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId) as any;
  const keyData = db.prepare('SELECT * FROM keys WHERE guild_id = ? AND is_active = 1').get(guildId) as any;
  const panelData = db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ?').all(guildId) as any[];
  const automodData = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guildId) as any;
  const warnCount = (db.prepare('SELECT COUNT(*) as c FROM warnings WHERE guild_id = ?').get(guildId) as any).c;
  const ticketCount = (db.prepare('SELECT COUNT(*) as c FROM tickets WHERE guild_id = ?').get(guildId) as any).c;
  const econUsers = (db.prepare('SELECT COUNT(*) as c FROM economy WHERE guild_id = ?').get(guildId) as any).c;
  const leveledUsers = (db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId) as any).c;

  const isExpired = keyData?.expires_at ? Date.now() > new Date(keyData.expires_at).getTime() : true;

  res.render('customer/server', {
    title: guild.name,
    user: customer,
    guild: {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
      ownerId: guild.ownerId,
      isOwner,
    },
    guilds: res.locals.sidebarGuilds || [],
    settings: {
      lang: dbData?.lang || 'ar',
      welcome_channel: dbData?.welcome_channel || null,
      welcome_message: dbData?.welcome_message || null,
      has_key: !!keyData && !isExpired,
      expires_at: keyData?.expires_at || null,
      panels: panelData,
      automod: automodData || null,
      warnCount,
      ticketCount,
      econUsers,
      leveledUsers,
    },
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/save', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const client = getBotClient();

  const guild = client?.guilds.cache.get(guildId);
  if (!guild) return res.status(404).send('Server not found');

  const member = guild.members.cache.get(customer.id);
  const isOwner = guild.ownerId === customer.id;
  const hasAdmin = isOwner || member?.permissions.has(0x8n);
  if (!hasAdmin) return res.status(403).send('No permission');

  const lang = String(req.body.lang || '');
  const welcome_channel = String(req.body.welcome_channel || '');
  const welcome_message = String(req.body.welcome_message || '');

  const updates: string[] = [];
  const params: any[] = [];

  if (lang) { updates.push('lang = ?'); params.push(lang); }
  if (welcome_channel) { updates.push('welcome_channel = ?'); params.push(welcome_channel); }
  if (welcome_message) { updates.push('welcome_message = ?'); params.push(welcome_message); }

  if (updates.length > 0) {
    params.push(guildId);
    db.prepare(`UPDATE guilds SET ${updates.join(', ')} WHERE guild_id = ?`).run(...params);
  }

  res.redirect(`/customer/guild/${guildId}?saved=1`);
});

async function checkGuildAccess(guildId: string, customerId: string): Promise<{ guild: any; isOwner: boolean; hasAdmin: boolean } | null> {
  const client = getBotClient();
  const guild = client?.guilds.cache.get(guildId);
  if (!guild) return null;
  const member = guild.members.cache.get(customerId);
  const isOwner = guild.ownerId === customerId;
  const hasAdmin = isOwner || member?.permissions.has(0x8n);
  if (!hasAdmin) return null;
  return { guild, isOwner, hasAdmin };
}

customerRouter.get('/guild/:guildId/commands', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const { getCommands } = await import('../../bot/handlers/commandHandler');
  const allCommands = getCommands();
  const savedConfigs = db.prepare('SELECT * FROM server_commands WHERE guild_id = ?').all(guildId) as any[];

  const commandList = allCommands.map(cmd => {
    const saved = savedConfigs.find(c => c.command_name === cmd.data.name);
    return {
      name: cmd.data.name,
      description: cmd.data.description || '',
      category: cmd.category,
      enabled: saved ? saved.enabled : 1,
      custom_name: saved ? saved.custom_name || '' : '',
    };
  });

  res.render('customer/commands', {
    title: 'Command Manager',
    user: customer,
    guild: access.guild,
    commands: commandList,
    guilds: res.locals.sidebarGuilds || [],
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/commands/save', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const { enabled, custom_name } = req.body;

  if (enabled && typeof enabled === 'object') {
    for (const [cmdName, val] of Object.entries(enabled)) {
      const isEnabled = val === '1' || val === true ? 1 : 0;
      const custom = custom_name?.[cmdName] || '';
      db.prepare(
        'INSERT INTO server_commands (guild_id, command_name, enabled, custom_name) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, command_name) DO UPDATE SET enabled = ?, custom_name = ?'
      ).run(guildId, cmdName, isEnabled, custom, isEnabled, custom);
    }
  }

  const { syncGuild } = await import('../../bot/handlers/commandHandler');
  await syncGuild(guildId);

  res.redirect(`/customer/guild/${guildId}/commands?saved=1`);
});

customerRouter.get('/guild/:guildId/automod', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  let config = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guildId) as any;
  if (!config) {
    db.prepare('INSERT INTO automod_settings (guild_id) VALUES (?)').run(guildId);
    config = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guildId) as any;
  }

  res.render('customer/automod', {
    title: 'AutoMod Settings',
    user: customer,
    guild: access.guild,
    config,
    guilds: res.locals.sidebarGuilds || [],
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/automod/save', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const anti_spam = req.body.anti_spam === 'on' ? 1 : 0;
  const anti_links = req.body.anti_links === 'on' ? 1 : 0;
  const anti_caps = req.body.anti_caps === 'on' ? 1 : 0;
  const log_channel = String(req.body.log_channel || '');
  const bad_words_raw = String(req.body.bad_words || '');
  const bad_words = JSON.stringify(bad_words_raw.split('\n').filter((w: string) => w.trim()).map((w: string) => w.trim()));

  db.prepare(
    'INSERT INTO automod_settings (guild_id, anti_spam, anti_links, anti_caps, bad_words, log_channel) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET anti_spam = ?, anti_links = ?, anti_caps = ?, bad_words = ?, log_channel = ?'
  ).run(guildId, anti_spam, anti_links, anti_caps, bad_words, log_channel, anti_spam, anti_links, anti_caps, bad_words, log_channel);

  res.redirect(`/customer/guild/${guildId}/automod?saved=1`);
});

customerRouter.get('/guild/:guildId/tickets', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const panels = db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ?').all(guildId) as any[];
  const ticketCount = (db.prepare('SELECT COUNT(*) as c FROM tickets WHERE guild_id = ?').get(guildId) as any).c;

  res.render('customer/tickets', {
    title: 'Ticket Settings',
    user: customer,
    guild: access.guild,
    panels,
    ticketCount,
    guilds: res.locals.sidebarGuilds || [],
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/tickets/save-panel', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const panelName = String(req.body.panel_name || 'default');
  const embed_title = String(req.body.embed_title || 'Create a Ticket');
  const embed_description = String(req.body.embed_description || 'Click a button below to open a ticket.');
  const embed_color = String(req.body.embed_color || '#0099ff');
  let categories;
  if (req.body.label && Array.isArray(req.body.label)) {
    const labels = req.body.label;
    const emojis = Array.isArray(req.body.emoji) ? req.body.emoji : [req.body.emoji];
    const colors = Array.isArray(req.body.color) ? req.body.color : [req.body.color];
    const welcomes = Array.isArray(req.body.welcome) ? req.body.welcome : [req.body.welcome];
    categories = labels.filter((l: string) => l && l.trim()).map((l: string, i: number) => ({
      label: l.trim(), emoji: emojis[i] || '🎫', color: colors[i] || 'Primary',
      ticket_category: null, support_roles: [], welcome_message: welcomes[i] || 'Support will be with you shortly.',
    }));
    if (categories.length === 0) categories = [{ label: 'Support', emoji: '🎫', color: 'Primary', ticket_category: null, support_roles: [], welcome_message: 'Support will be with you shortly.' }];
  } else {
    const categoriesRaw = String(req.body.categories || '');
    try { categories = JSON.parse(categoriesRaw); } catch { categories = [{ label: 'Support', emoji: '🎫', color: 'Primary', ticket_category: null, support_roles: [], welcome_message: 'Support will be with you shortly.' }]; }
  }

  db.prepare(
    'INSERT INTO ticket_panels (guild_id, panel_name, embed_title, embed_description, embed_color, categories) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(guild_id, panel_name) DO UPDATE SET embed_title = ?, embed_description = ?, embed_color = ?, categories = ?'
  ).run(guildId, panelName, embed_title, embed_description, embed_color, JSON.stringify(categories), embed_title, embed_description, embed_color, JSON.stringify(categories));

  res.redirect(`/customer/guild/${guildId}/tickets?saved=1`);
});

customerRouter.post('/guild/:guildId/tickets/send-panel', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const panelName = String(req.body.panel_name || 'default');
  const channelId = String(req.body.channel_id || '');

  if (!channelId) return res.redirect(`/customer/guild/${guildId}/tickets?error=no_channel`);

  const panel = db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ? AND panel_name = ?').get(guildId, panelName) as any;
  if (!panel) return res.redirect(`/customer/guild/${guildId}/tickets?error=no_panel`);

  const client = getBotClient();
  const channel = client?.channels.cache.get(channelId) as any;
  if (!channel) return res.redirect(`/customer/guild/${guildId}/tickets?error=bad_channel`);

  const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = await import('discord.js');
  const categories = JSON.parse(panel.categories || '[]');
  const embed = new EmbedBuilder()
    .setTitle(panel.embed_title || 'Create a Ticket')
    .setDescription(panel.embed_description || 'Click a button below to open a ticket.')
    .setColor((panel.embed_color || '#0099ff') as any)
    .setTimestamp();

  const rows: any[] = [];
  let currentRow = new ActionRowBuilder<any>();
  for (const cat of categories) {
    const btn = new ButtonBuilder()
      .setCustomId(`ticket_panel_${panelName}_${cat.label}`)
      .setLabel(cat.label)
      .setStyle((ButtonStyle as any)[cat.color] || ButtonStyle.Primary);
    if (cat.emoji) btn.setEmoji(cat.emoji);
    if (currentRow.components.length >= 5) { rows.push(currentRow); currentRow = new ActionRowBuilder<any>(); }
    currentRow.addComponents(btn);
  }
  if (currentRow.components.length > 0) rows.push(currentRow);

  const msg = await channel.send({ embeds: [embed], components: rows });
  db.prepare('UPDATE ticket_panels SET channel_id = ?, message_id = ? WHERE guild_id = ? AND panel_name = ?').run(channelId, msg.id, guildId, panelName);

  res.redirect(`/customer/guild/${guildId}/tickets?saved=1`);
});

customerRouter.get('/guild/:guildId/reaction-roles', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const rrs = db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?').all(guildId) as any[];
  const panels = db.prepare('SELECT * FROM role_panels WHERE guild_id = ? ORDER BY id DESC').all(guildId) as any[];

  res.render('customer/reactionroles', {
    title: 'Reaction Roles',
    user: customer,
    guild: access.guild,
    rrs,
    panels,
    guilds: res.locals.sidebarGuilds || [],
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/role-panels/save', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const title = String(req.body.title || 'Pick a Role');
  const description = String(req.body.description || 'Select a role from the dropdown below.');
  const placeholder = String(req.body.placeholder || 'Choose a role...');
  const max_select = parseInt(String(req.body.max_select || '1'));

  const roleIds = Array.isArray(req.body.role_id) ? req.body.role_id : [req.body.role_id];
  const labels = Array.isArray(req.body.label) ? req.body.label : [req.body.label];
  const descriptions = Array.isArray(req.body.description) ? req.body.description : [req.body.description];
  const emojis = Array.isArray(req.body.emoji) ? req.body.emoji : [req.body.emoji];

  const result = db.prepare(
    'INSERT INTO role_panels (guild_id, title, description, placeholder, max_select) VALUES (?, ?, ?, ?, ?)'
  ).run(guildId, title, description, placeholder, max_select);

  const panelId = result.lastInsertRowid as number;
  const stmt = db.prepare(
    'INSERT INTO role_panel_options (panel_id, role_id, label, description, emoji, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (let i = 0; i < roleIds.length; i++) {
    if (roleIds[i] && roleIds[i].trim()) {
      stmt.run(panelId, roleIds[i].trim(), labels[i] || 'Role', descriptions[i] || '', emojis[i] || '', i);
    }
  }

  res.redirect(`/customer/guild/${guildId}/reaction-roles?saved=1`);
});

customerRouter.post('/guild/:guildId/role-panels/send/:panelId', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const panelId = parseInt(String(req.params.panelId));
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const channelId = String(req.body.channel_id || '');
  if (!channelId) return res.redirect(`/customer/guild/${guildId}/reaction-roles?error=no_channel`);

  const panel = db.prepare('SELECT * FROM role_panels WHERE id = ? AND guild_id = ?').get(panelId, guildId) as any;
  if (!panel) return res.redirect(`/customer/guild/${guildId}/reaction-roles?error=not_found`);

  const options = db.prepare('SELECT * FROM role_panel_options WHERE panel_id = ? ORDER BY sort_order').all(panelId) as any[];

  const client = getBotClient();
  const channel = client?.channels.cache.get(channelId) as any;
  if (!channel) return res.redirect(`/customer/guild/${guildId}/reaction-roles?error=bad_channel`);

  const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = await import('discord.js');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`role_panel_${panelId}`)
    .setPlaceholder(panel.placeholder || 'Choose a role...')
    .setMinValues(0)
    .setMaxValues(Math.min(panel.max_select || 1, options.length));

  for (const opt of options) {
    selectMenu.addOptions({
      label: opt.label,
      value: `role_${opt.role_id}`,
      description: opt.description || undefined,
      emoji: opt.emoji || undefined,
    });
  }

  const row = new ActionRowBuilder<any>().addComponents(selectMenu);
  const embed = new EmbedBuilder()
    .setTitle(panel.title || 'Pick a Role')
    .setDescription(panel.description || 'Select a role from the dropdown below.')
    .setColor(0x6c5ce7);

  const msg = await channel.send({ embeds: [embed], components: [row] });
  db.prepare('UPDATE role_panels SET channel_id = ?, message_id = ? WHERE id = ?').run(channelId, msg.id, panelId);

  res.redirect(`/customer/guild/${guildId}/reaction-roles?saved=1`);
});

customerRouter.post('/guild/:guildId/role-panels/delete/:panelId', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const panelId = parseInt(String(req.params.panelId));
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  db.prepare('DELETE FROM role_panel_options WHERE panel_id = ?').run(panelId);
  db.prepare('DELETE FROM role_panels WHERE id = ? AND guild_id = ?').run(panelId, guildId);

  res.redirect(`/customer/guild/${guildId}/reaction-roles?saved=1`);
});

customerRouter.post('/guild/:guildId/reaction-roles/save', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const channel_id = String(req.body.channel_id || '');
  const message_id = String(req.body.message_id || '');
  const role_id = String(req.body.role_id || '');
  const emoji = String(req.body.emoji || '');

  if (!channel_id || !message_id || !role_id || !emoji) {
    return res.redirect(`/customer/guild/${guildId}/reaction-roles?error=missing_fields`);
  }

  db.prepare('INSERT OR IGNORE INTO reaction_roles (guild_id, channel_id, message_id, role_id, emoji) VALUES (?, ?, ?, ?, ?)').run(guildId, channel_id, message_id, role_id, emoji);
  res.redirect(`/customer/guild/${guildId}/reaction-roles?saved=1`);
});

customerRouter.post('/guild/:guildId/reaction-roles/delete/:id', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const id = parseInt(String(req.params.id));
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  db.prepare('DELETE FROM reaction_roles WHERE id = ? AND guild_id = ?').run(id, guildId);
  res.redirect(`/customer/guild/${guildId}/reaction-roles?saved=1`);
});

customerRouter.get('/guild/:guildId/suggestions', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const config = db.prepare('SELECT * FROM suggestion_config WHERE guild_id = ?').get(guildId) as any || {};
  const suggestions = db.prepare('SELECT * FROM suggestions WHERE guild_id = ? ORDER BY created_at DESC').all(guildId) as any[];

  res.render('customer/suggestions', {
    title: 'Suggestions',
    user: customer,
    guild: access.guild,
    config,
    suggestions,
    guilds: res.locals.sidebarGuilds || [],
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/suggestions/config', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const channel_id = String(req.body.channel_id || '');
  const staff_roles_raw = String(req.body.staff_roles || '');
  const staff_roles = JSON.stringify(staff_roles_raw.split('\n').filter(r => r.trim()).map(r => r.trim()));

  db.prepare(
    'INSERT INTO suggestion_config (guild_id, channel_id, staff_roles) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET channel_id = ?, staff_roles = ?'
  ).run(guildId, channel_id, staff_roles, channel_id, staff_roles);

  res.redirect(`/customer/guild/${guildId}/suggestions?saved=1`);
});

customerRouter.post('/guild/:guildId/suggestions/action/:id', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const id = parseInt(String(req.params.id));
  const action = String(req.query.action || '');
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  if (['accept', 'deny', 'implement'].includes(action)) {
    db.prepare('UPDATE suggestions SET status = ? WHERE id = ? AND guild_id = ?').run(action, id, guildId);

    const suggestion = db.prepare('SELECT * FROM suggestions WHERE id = ? AND guild_id = ?').get(id, guildId) as any;
    if (suggestion?.channel_id && suggestion?.message_id) {
      const client = getBotClient();
      const channel = client?.channels.cache.get(suggestion.channel_id) as any;
      if (channel) {
        try {
          const msg = await channel.messages.fetch(suggestion.message_id);
          const embed = msg.embeds[0];
          if (embed) {
            const { EmbedBuilder } = await import('discord.js');
            const statusMap: any = { accept: 'Accepted', deny: 'Denied', implement: 'Implemented' };
            const colorMap: any = { accept: 0x00c853, deny: 0xff5252, implement: 0x0099ff };
            const updated = EmbedBuilder.from(embed)
              .spliceFields(0, 1, { name: 'Status', value: statusMap[action] || action, inline: true })
              .setColor(colorMap[action] || 0x00aeff);
            await msg.edit({ embeds: [updated] });
          }
        } catch {}
      }
    }
  }

  res.redirect(`/customer/guild/${guildId}/suggestions?saved=1`);
});

customerRouter.get('/guild/:guildId/protection', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  let config = db.prepare('SELECT * FROM protection_config WHERE guild_id = ?').get(guildId) as any;
  if (!config) {
    db.prepare('INSERT INTO protection_config (guild_id) VALUES (?)').run(guildId);
    config = db.prepare('SELECT * FROM protection_config WHERE guild_id = ?').get(guildId) as any;
  }

  res.render('customer/protection', {
    title: 'Protection',
    user: customer,
    guild: access.guild,
    config,
    guilds: res.locals.sidebarGuilds || [],
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/protection/save', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const anti_spam = req.body.anti_spam === 'on' ? 1 : 0;
  const anti_links = req.body.anti_links === 'on' ? 1 : 0;
  const anti_caps = req.body.anti_caps === 'on' ? 1 : 0;
  const anti_raid = req.body.anti_raid === 'on' ? 1 : 0;
  const raid_limit = parseInt(String(req.body.raid_limit || '10'));
  const raid_action = String(req.body.raid_action || 'kick');
  const anti_phishing = req.body.anti_phishing === 'on' ? 1 : 0;
  const anti_alt = req.body.anti_alt === 'on' ? 1 : 0;
  const alt_age_hours = parseInt(String(req.body.alt_age_hours || '24'));
  const punishment = String(req.body.punishment || 'warn');
  const bypass_raw = String(req.body.bypass_roles || '');
  const bypass_roles = JSON.stringify(bypass_raw.split('\n').filter(r => r.trim()).map(r => r.trim()));
  const log_channel = String(req.body.log_channel || '');

  db.prepare(
    `INSERT INTO protection_config (guild_id, anti_spam, anti_links, anti_caps, anti_raid, raid_limit, raid_action, anti_phishing, anti_alt, alt_age_hours, punishment, bypass_roles, log_channel)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET
     anti_spam=?, anti_links=?, anti_caps=?, anti_raid=?, raid_limit=?, raid_action=?, anti_phishing=?, anti_alt=?, alt_age_hours=?, punishment=?, bypass_roles=?, log_channel=?`
  ).run(guildId, anti_spam, anti_links, anti_caps, anti_raid, raid_limit, raid_action, anti_phishing, anti_alt, alt_age_hours, punishment, bypass_roles, log_channel,
    anti_spam, anti_links, anti_caps, anti_raid, raid_limit, raid_action, anti_phishing, anti_alt, alt_age_hours, punishment, bypass_roles, log_channel);

  res.redirect(`/customer/guild/${guildId}/protection?saved=1`);
});

customerRouter.post('/guild/:guildId/tickets/save-categories', requireCustomer, async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const panelName = String(req.body.panel_name || 'default');
  const labels = Array.isArray(req.body.label) ? req.body.label : [req.body.label];
  const emojis = Array.isArray(req.body.emoji) ? req.body.emoji : [req.body.emoji];
  const colors = Array.isArray(req.body.color) ? req.body.color : [req.body.color];
  const welcomes = Array.isArray(req.body.welcome) ? req.body.welcome : [req.body.welcome];

  db.prepare('DELETE FROM ticket_categories WHERE guild_id = ? AND panel_name = ?').run(guildId, panelName);

  const stmt = db.prepare(
    'INSERT INTO ticket_categories (guild_id, panel_name, label, emoji, color, welcome_message, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  for (let i = 0; i < labels.length; i++) {
    if (labels[i] && labels[i].trim()) {
      stmt.run(guildId, panelName, labels[i].trim(), emojis[i] || '🎫', colors[i] || 'Primary', welcomes[i] || 'Support will be with you shortly.', i);
    }
  }

  const cats = labels.filter((l: string) => l && l.trim()).map((l: string, i: number) => ({
    label: l.trim(), emoji: emojis[i] || '🎫', color: colors[i] || 'Primary',
    ticket_category: null, support_roles: [], welcome_message: welcomes[i] || 'Support will be with you shortly.',
  }));

  db.prepare(
    'INSERT INTO ticket_panels (guild_id, panel_name, categories) VALUES (?, ?, ?) ON CONFLICT(guild_id, panel_name) DO UPDATE SET categories = ?'
  ).run(guildId, panelName, JSON.stringify(cats), JSON.stringify(cats));

  res.redirect(`/customer/guild/${guildId}/tickets?saved=1`);
});

customerRouter.get('/guild/:guildId/leveling', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const rewards = db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC').all(guildId) as any[];
  const leveledUsers = (db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId) as any).c;

  res.render('customer/leveling', {
    title: 'Leveling',
    user: customer,
    guild: access.guild,
    rewards,
    leveledUsers,
    guilds: res.locals.sidebarGuilds || [],
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/leveling/reward', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const level = parseInt(String(req.body.level || '0'));
  const role_id = String(req.body.role_id || '');

  if (level < 1 || !role_id) {
    return res.redirect(`/customer/guild/${guildId}/leveling?error=invalid`);
  }

  db.prepare('INSERT OR REPLACE INTO level_rewards (guild_id, level, role_id) VALUES (?, ?, ?)').run(guildId, level, role_id);
  res.redirect(`/customer/guild/${guildId}/leveling?saved=1`);
});

customerRouter.post('/guild/:guildId/leveling/delete/:rewardId', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const rewardId = parseInt(String(req.params.rewardId));
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  db.prepare('DELETE FROM level_rewards WHERE id = ? AND guild_id = ?').run(rewardId, guildId);
  res.redirect(`/customer/guild/${guildId}/leveling?saved=1`);
});

customerRouter.get('/guild/:guildId/shop', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const items = db.prepare('SELECT * FROM shop_items WHERE guild_id = ? ORDER BY price ASC').all(guildId) as any[];

  res.render('customer/shop', {
    title: 'Shop',
    user: customer,
    guild: access.guild,
    items,
    guilds: res.locals.sidebarGuilds || [],
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/shop/save', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const price = parseInt(String(req.body.price || '0'));
  const role_id = String(req.body.role_id || '').trim() || null;
  const emoji = String(req.body.emoji || '🛒').trim();

  if (!name || price < 1) {
    return res.redirect(`/customer/guild/${guildId}/shop?error=invalid`);
  }

  db.prepare('INSERT OR REPLACE INTO shop_items (guild_id, name, description, price, role_id, emoji) VALUES (?, ?, ?, ?, ?, ?)')
    .run(guildId, name, description, price, role_id, emoji);
  res.redirect(`/customer/guild/${guildId}/shop?saved=1`);
});

customerRouter.post('/guild/:guildId/shop/delete/:itemId', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const itemId = parseInt(String(req.params.itemId));
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  db.prepare('DELETE FROM shop_items WHERE id = ? AND guild_id = ?').run(itemId, guildId);
  res.redirect(`/customer/guild/${guildId}/shop?saved=1`);
});

customerRouter.get('/guild/:guildId/admin-roles', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const adminRoles = db.prepare('SELECT * FROM admin_roles WHERE guild_id = ? ORDER BY permission_level ASC').all(guildId) as any[];

  res.render('customer/adminroles', {
    title: 'Admin Roles',
    user: customer,
    guild: access.guild,
    adminRoles,
    guilds: res.locals.sidebarGuilds || [],
    query: req.query,
  });
});

customerRouter.post('/guild/:guildId/admin-roles/save', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  const role_id = String(req.body.role_id || '').trim();
  const permission_level = String(req.body.permission_level || 'limited').trim();

  if (!role_id || !['limited', 'moderate', 'full'].includes(permission_level)) {
    return res.redirect(`/customer/guild/${guildId}/admin-roles?error=invalid`);
  }

  db.prepare('INSERT OR REPLACE INTO admin_roles (guild_id, role_id, permission_level) VALUES (?, ?, ?)')
    .run(guildId, role_id, permission_level);
  res.redirect(`/customer/guild/${guildId}/admin-roles?saved=1`);
});

customerRouter.post('/guild/:guildId/admin-roles/delete/:roleId', async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const roleId = String(req.params.roleId);
  const customer = (req.session as any).customer;
  const access = await checkGuildAccess(guildId, customer.id);
  if (!access) return res.status(403).send('Access denied');

  db.prepare('DELETE FROM admin_roles WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
  res.redirect(`/customer/guild/${guildId}/admin-roles?saved=1`);
});

customerRouter.get('/logout', (req: Request, res: Response) => {
  (req.session as any).customer = null;
  res.redirect('/customer/login');
});

export { requireCustomer };
