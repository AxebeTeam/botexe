import db from './connection';

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      guild_id TEXT,
      activated_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      activated_at TEXT,
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      max_servers INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS guilds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT UNIQUE NOT NULL,
      guild_name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_whitelisted INTEGER NOT NULL DEFAULT 0,
      lang TEXT NOT NULL DEFAULT 'ar',
      welcome_channel TEXT,
      welcome_message TEXT,
      prefix TEXT NOT NULL DEFAULT '/'
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      prize TEXT NOT NULL,
      winners_count INTEGER NOT NULL DEFAULT 1,
      ends_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS economy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      bank INTEGER NOT NULL DEFAULT 0,
      last_daily TEXT,
      UNIQUE(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      UNIQUE(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS muted_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT,
      muted_at TEXT NOT NULL DEFAULT (datetime('now')),
      unmute_at TEXT,
      UNIQUE(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      UNIQUE(giveaway_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS reaction_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      UNIQUE(guild_id, message_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS ticket_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      panel_name TEXT NOT NULL DEFAULT 'default',
      channel_id TEXT,
      message_id TEXT,
      embed_title TEXT DEFAULT 'Create a Ticket',
      embed_description TEXT DEFAULT 'Click a button below to open a ticket.',
      embed_color TEXT DEFAULT '#0099ff',
      footer_text TEXT DEFAULT '',
      categories TEXT NOT NULL DEFAULT '[{"label":"Support","emoji":"🎫","color":"Primary","ticket_category":null,"support_roles":[],"welcome_message":"We will be with you shortly."}]',
      UNIQUE(guild_id, panel_name)
    );

    CREATE TABLE IF NOT EXISTS server_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      custom_name TEXT,
      UNIQUE(guild_id, command_name)
    );

    CREATE TABLE IF NOT EXISTS ticket_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      panel_name TEXT NOT NULL DEFAULT 'default',
      label TEXT NOT NULL,
      emoji TEXT DEFAULT '🎫',
      color TEXT DEFAULT 'Primary',
      category_id TEXT,
      support_roles TEXT DEFAULT '[]',
      welcome_message TEXT DEFAULT 'Support will be with you shortly.',
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(guild_id, panel_name, label)
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT,
      message_id TEXT,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      staff_reply TEXT,
      upvotes INTEGER NOT NULL DEFAULT 0,
      downvotes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS suggestion_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT UNIQUE NOT NULL,
      channel_id TEXT,
      staff_roles TEXT DEFAULT '[]',
      vote_threshold INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS protection_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT UNIQUE NOT NULL,
      anti_spam INTEGER NOT NULL DEFAULT 0,
      anti_links INTEGER NOT NULL DEFAULT 0,
      anti_caps INTEGER NOT NULL DEFAULT 0,
      anti_raid INTEGER NOT NULL DEFAULT 0,
      raid_limit INTEGER NOT NULL DEFAULT 10,
      raid_action TEXT NOT NULL DEFAULT 'kick',
      anti_phishing INTEGER NOT NULL DEFAULT 0,
      anti_alt INTEGER NOT NULL DEFAULT 0,
      alt_age_hours INTEGER NOT NULL DEFAULT 24,
      punishment TEXT NOT NULL DEFAULT 'warn',
      bypass_roles TEXT DEFAULT '[]',
      log_channel TEXT
    );

    CREATE TABLE IF NOT EXISTS level_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      UNIQUE(guild_id, level)
    );

    CREATE TABLE IF NOT EXISTS admin_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      permission_level TEXT NOT NULL DEFAULT 'limited' CHECK(permission_level IN ('limited','moderate','full')),
      UNIQUE(guild_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price INTEGER NOT NULL DEFAULT 0,
      role_id TEXT,
      emoji TEXT DEFAULT '🛒',
      UNIQUE(guild_id, name)
    );

    CREATE TABLE IF NOT EXISTS user_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(guild_id, user_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS automod_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT UNIQUE NOT NULL,
      anti_spam INTEGER NOT NULL DEFAULT 0,
      anti_links INTEGER NOT NULL DEFAULT 0,
      anti_caps INTEGER NOT NULL DEFAULT 0,
      bad_words TEXT DEFAULT '[]',
      ignored_roles TEXT DEFAULT '[]',
      log_channel TEXT
    );

    CREATE TABLE IF NOT EXISTS role_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT,
      message_id TEXT,
      title TEXT NOT NULL DEFAULT 'Pick a Role',
      description TEXT DEFAULT 'Select a role from the dropdown below.',
      placeholder TEXT DEFAULT 'Choose a role...',
      max_select INTEGER NOT NULL DEFAULT 1,
      UNIQUE(guild_id, id)
    );

    CREATE TABLE IF NOT EXISTS role_panel_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      panel_id INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT DEFAULT '',
      emoji TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(panel_id, role_id)
    );
  `);

  const existingKeys = db.prepare('SELECT COUNT(*) as count FROM config WHERE key = ?').get('initialized') as any;
  if (!existingKeys || existingKeys.count === 0) {
    db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)').run('initialized', 'true');

    const keyCount = db.prepare('SELECT COUNT(*) as count FROM keys').get() as any;
    if (keyCount.count === 0) {
      const { generateKey } = require('../utils/keyGenerator');
      const stmt = db.prepare('INSERT INTO keys (key, expires_at) VALUES (?, ?)');
      for (let i = 0; i < 10; i++) {
        const key = generateKey();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        stmt.run(key, expiresAt.toISOString());
      }
      const { logger } = require('../utils/logger');
      logger.info('Generated 10 initial license keys');
    }
  }
}
