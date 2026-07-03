import { Router, Request, Response } from 'express';
import { requireAuth } from './auth';
import db from '../../database/connection';
import { generateKey } from '../../utils/keyGenerator';
import { logger } from '../../utils/logger';

export const keysRouter = Router();

keysRouter.use(requireAuth);

keysRouter.get('/', (req: Request, res: Response) => {
  const filter = (req.query.filter as string) || 'all';

  let keys: any[];
  switch (filter) {
    case 'active':
      keys = db.prepare('SELECT * FROM keys WHERE is_active = 1 ORDER BY created_at DESC').all();
      break;
    case 'inactive':
      keys = db.prepare('SELECT * FROM keys WHERE is_active = 0 AND guild_id IS NULL ORDER BY created_at DESC').all();
      break;
    case 'expired':
      keys = db.prepare("SELECT * FROM keys WHERE expires_at < datetime('now') ORDER BY created_at DESC").all();
      break;
    default:
      keys = db.prepare('SELECT * FROM keys ORDER BY created_at DESC').all();
  }

  const total = (db.prepare('SELECT COUNT(*) as count FROM keys').get() as any).count;
  const active = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE is_active = 1').get() as any).count;

  const keysWithStatus = keys.map(k => ({
    ...k,
    is_expired: k.expires_at ? Date.now() > new Date(k.expires_at).getTime() : false,
    days_left: k.expires_at ? Math.max(0, Math.floor((new Date(k.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
  }));

  res.render('keys', {
    title: 'Key Management',
    keys: keysWithStatus,
    filter,
    total,
    active,
  });
});

keysRouter.post('/create', (req: Request, res: Response) => {
  const days = parseInt(String(req.body.days)) || 30;
  const key = generateKey();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  db.prepare('INSERT INTO keys (key, expires_at) VALUES (?, ?)').run(key, expiresAt.toISOString());
  logger.info(`Dashboard created key: ${key}`);

  res.redirect('/keys');
});

keysRouter.post('/delete/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const key = db.prepare('SELECT * FROM keys WHERE id = ?').get(id) as any;

  if (key) {
    db.prepare('DELETE FROM keys WHERE id = ?').run(id);
    logger.info(`Dashboard deleted key: ${key.key}`);
  }

  res.redirect('/keys');
});

keysRouter.post('/extend/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const days = parseInt(String(req.body.days)) || 30;
  const key = db.prepare('SELECT * FROM keys WHERE id = ?').get(id) as any;

  if (key) {
    const currentExpires = key.expires_at ? new Date(key.expires_at) : new Date();
    currentExpires.setDate(currentExpires.getDate() + days);

    db.prepare('UPDATE keys SET expires_at = ?, is_active = 1 WHERE id = ?').run(currentExpires.toISOString(), id);
    logger.info(`Dashboard extended key ${key.key} by ${days} days`);
  }

  res.redirect('/keys');
});

keysRouter.post('/deactivate/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  db.prepare('UPDATE keys SET is_active = 0, guild_id = NULL WHERE id = ?').run(id);
  res.redirect('/keys');
});
