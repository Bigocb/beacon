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
  const authHeader = req.headers.authorization;
  console.log('🔐 [authMiddleware] Authorization header:', authHeader ? '✓ present' : '✗ missing');

  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    console.error('❌ [authMiddleware] Token missing - headers:', Object.keys(req.headers));
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  console.log('🔍 [authMiddleware] Verifying token...');
  const decoded = verifyJWT(token);
  if (!decoded) {
    console.error('❌ [authMiddleware] Token verification failed');
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  console.log('✅ [authMiddleware] Token verified for user:', decoded.uuid);
  req.user = decoded;
  next();
}
