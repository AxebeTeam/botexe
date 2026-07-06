import express from 'express';
import session from 'express-session';
import path from 'path';
import { Client } from 'discord.js';
import { logger } from '../utils/logger';
import { authRouter } from './routes/auth';
import { keysRouter } from './routes/keys';
import { serversRouter, setClientGetter } from './routes/servers';
import { commandsRouter } from './routes/commands';
import { customerRouter } from './routes/customer';
import db from '../database/connection';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));

app.use((req, res, next) => {
  res.locals.user = (req.session as any).user || null;
  next();
});

app.use('/', authRouter);
app.use('/keys', keysRouter);
app.use('/servers', serversRouter);
app.use('/commands', commandsRouter);
app.use('/customer', customerRouter);

app.get('/', (req, res) => {
  if (!(req.session as any).user) {
    return res.redirect('/login');
  }

  const totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys').get() as any).count;
  const activeKeys = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE is_active = 1').get() as any).count;
  const totalGuilds = (db.prepare('SELECT COUNT(*) as count FROM guilds').get() as any).count;
  const unassignedKeys = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE is_active = 0 AND guild_id IS NULL').get() as any).count;
  const expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE expires_at < datetime('now') AND is_active = 1").get() as any).count;
  const totalWarnings = (db.prepare('SELECT COUNT(*) as count FROM warnings').get() as any).count;
  const totalTickets = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as any).count;
  const openTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'").get() as any).count;
  const totalGiveaways = (db.prepare('SELECT COUNT(*) as count FROM giveaways').get() as any).count;
  const activeGiveaways = (db.prepare('SELECT COUNT(*) as count FROM giveaways WHERE ended = 0').get() as any).count;
  const economyUsers = (db.prepare('SELECT COUNT(*) as count FROM economy').get() as any).count;
  const leveledUsers = (db.prepare('SELECT COUNT(*) as count FROM levels').get() as any).count;
  const totalReactionRoles = (db.prepare('SELECT COUNT(*) as count FROM reaction_roles').get() as any).count;
  const guildsWithAutomod = (db.prepare('SELECT COUNT(*) as count FROM automod_settings').get() as any).count;

  res.render('index', {
    title: 'Dashboard',
    user: (req.session as any).user,
    totalKeys,
    activeKeys,
    totalGuilds,
    unassignedKeys,
    expiredKeys,
    totalWarnings,
    totalTickets,
    openTickets,
    totalGiveaways,
    activeGiveaways,
    economyUsers,
    leveledUsers,
    totalReactionRoles,
    guildsWithAutomod,
  });
});

let _client: Client | null = null;

export function getBotClient(): Client | null {
  return _client;
}

export function startDashboard(client?: Client): void {
  if (client) {
    _client = client;
    setClientGetter(() => _client);
  }
  app.listen(PORT, '0.0.0.0', () => {
    logger.success(`Dashboard running on http://localhost:${PORT}`);
  });
}
