import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { prisma } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'manager' | 'attendant';
    name: string;
  };
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized: No token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;

    prisma.user
      .findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true, name: true },
      })
      .then((user) => {
        if (!user) {
          return next(new AppError('Unauthorized: User no longer exists', 401));
        }

        req.user = user;
        next();
      })
      .catch(next);
  } catch (error) {
    return next(new AppError('Unauthorized: Invalid or expired token', 401));
  }
};

export const requireRole = (roles: ('manager' | 'attendant')[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized: User not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'Forbidden: You do not have permission to access this resource',
          403
        )
      );
    }

    next();
  };
};
