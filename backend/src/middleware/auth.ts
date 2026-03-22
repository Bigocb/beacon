import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../auth/oauth';

export interface AuthenticatedRequest extends Request {
  user?: {
    uuid: string;
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const decoded = verifyJWT(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = decoded;
  next();
}
