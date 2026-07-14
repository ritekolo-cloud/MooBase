import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { registerSchema } from '../validators/auth.validator';
import { updateUserSchema } from '../validators/user.validator';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class UserController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        status: 'success',
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);

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

      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'CREATE_USER',
            description: `Manager created user account for ${user.email} (${user.role})`,
          },
        });
      }

      res.status(201).json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, email, password, role } = updateUserSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError(`User ${id} not found`, 404);
      }

      if (email && email !== user.email) {
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
          throw new AppError('Email/username already in use', 400);
        }
      }

      const dataToUpdate: any = {};
      if (name) dataToUpdate.name = name;
      if (email) dataToUpdate.email = email;
      if (role) dataToUpdate.role = role;
      if (password) {
        dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'UPDATE_USER',
            description: `Manager updated user account details for ${updatedUser.email}`,
          },
        });
      }

      res.status(200).json({
        status: 'success',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError(`User ${id} not found`, 404);
      }

      // Prevent manager from deleting themselves
      if (req.user && req.user.id === id) {
        throw new AppError('You cannot delete your own account', 400);
      }

      await prisma.user.delete({ where: { id } });

      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'DELETE_USER',
            description: `Manager deleted user account for ${user.email}`,
          },
        });
      }

      res.status(200).json({
        status: 'success',
        message: `User ${id} deleted successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default UserController;
