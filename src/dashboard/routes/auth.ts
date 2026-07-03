import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';

export const authRouter = Router();

const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME || 'admin';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'changeme123';

authRouter.get('/login', (req: Request, res: Response) => {
  if ((req.session as any).user) {
    return res.redirect('/');
  }
  res.render('login', { title: 'Login', error: null });
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (username === DASHBOARD_USERNAME && password === DASHBOARD_PASSWORD) {
    (req.session as any).user = { username, role: 'admin' };
    logger.info(`Dashboard login: ${username}`);
    return res.redirect('/');
  }

  res.render('login', { title: 'Login', error: 'Invalid credentials' });
});

authRouter.get('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req.session as any).user) {
    return res.redirect('/login');
  }
  next();
}

export { requireAuth };
