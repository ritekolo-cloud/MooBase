import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth.validator';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { EmailService } from '../services/email.service';


const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const refreshTokenExpiry = () => {
  const match = /^(\d+)([dhm])$/.exec(env.JWT_REFRESH_EXPIRES_IN);
  const amount = match ? Number(match[1]) : 7;
  const unit = match?.[2] || 'd';
  const multipliers = { d: 24 * 60 * 60 * 1000, h: 60 * 60 * 1000, m: 60 * 1000 };
  return new Date(Date.now() + amount * multipliers[unit as keyof typeof multipliers]);
};

const signAccessToken = (user: { id: string; email: string; role: string; name: string }) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] }
  );

const signRefreshToken = async (user: { id: string; email: string; role: string; name: string }) => {
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] }
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiry(),
    },
  });

  return refreshToken;
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) {
        throw new AppError('User with this email/username already exists', 400);
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: data.role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Log registration audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER',
          description: `Registered user ${user.email} with role ${user.role}`,
        },
      });

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: data.username },
      });

      if (!user) {
        throw new AppError('Invalid email/username or password', 401);
      }

      const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new AppError('Invalid email/username or password', 401);
      }

      const accessToken = signAccessToken(user);
      const refreshToken = await signRefreshToken(user);

      // Log login audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          description: `Logged in user ${user.email}`,
        },
      });

      res.status(200).json({
        status: 'success',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          username: user.email, // map email to username for client compatibility
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }

      const tokenHash = hashToken(refreshToken);
      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      } catch {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      const newAccessToken = signAccessToken(user);
      const newRefreshToken = await signRefreshToken(user);

      res.status(200).json({
        status: 'success',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await prisma.refreshToken.updateMany({
          where: {
            tokenHash: hashToken(refreshToken),
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, env.JWT_SECRET) as any;
          await prisma.auditLog.create({
            data: {
              userId: decoded.id,
              action: 'LOGOUT',
              description: `Logged out user ${decoded.email}`,
            },
          });
        } catch {
          // Token expired, ignore
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            name: user.name,
            username: user.email,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Return 200 even if user doesn't exist for security/privacy,
        // but indicate message sent if user exists.
        res.status(200).json({
          status: 'success',
          message: 'If a matching account exists, a password reset link has been sent.',
        });
        return;
      }

      const resetToken = jwt.sign(
        { id: user.id, email: user.email, purpose: 'password_reset' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const resetLink = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

      await EmailService.sendPasswordResetEmail(user.email, user.name, resetLink);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'FORGOT_PASSWORD_REQUEST',
          description: `Requested password reset link for ${user.email}`,
        },
      });

      res.status(200).json({
        status: 'success',
        message: 'If a matching account exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);

      let decoded: any;
      try {
        decoded = jwt.verify(token, env.JWT_SECRET);
      } catch (err) {
        throw new AppError('Invalid or expired password reset token', 400);
      }

      if (decoded.purpose !== 'password_reset') {
        throw new AppError('Invalid token usage', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Revoke all refresh tokens for this user for security
      await prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await EmailService.sendPasswordChangeConfirmationEmail(user.email, user.name);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_SUCCESS',
          description: `Password reset successfully via email link for ${user.email}`,
        },
      });

      res.status(200).json({
        status: 'success',
        message: 'Password has been reset successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new AppError('Invalid current password', 400);
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Revoke other active sessions (tokens)
      await prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await EmailService.sendPasswordChangeConfirmationEmail(user.email, user.name);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_CHANGE_SUCCESS',
          description: `Password changed successfully by user ${user.email}`,
        },
      });

      res.status(200).json({
        status: 'success',
        message: 'Password has been changed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}
export default AuthController;
