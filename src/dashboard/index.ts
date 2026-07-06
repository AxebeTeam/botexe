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
  return res.redirect('/customer/login');
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
