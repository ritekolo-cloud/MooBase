import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors: any = undefined;

  // Custom AppError or any error with explicit status code
  if (err instanceof AppError || err.statusCode || err.name === 'AppError') {
    statusCode = err.statusCode || 400;
    message = err.message;
  }
  // Zod validation error
  else if (err instanceof ZodError || err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors?.map((e: any) => ({
      field: e.path?.join('.'),
      message: e.message,
    }));
  }
  // Prisma unique constraint violation or validation errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError || err.code?.startsWith('P')) {
    if (err.code === 'P2002') {
      statusCode = 400;
      const target = (err.meta?.target as string[]) || [];
      message = `Unique constraint failed on: ${target.join(', ')}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else {
      statusCode = 400;
      message = `Database Error: ${err.message}`;
    }
  } else {
    console.error('❌ Unhandled Server Error:', err?.name, err?.message, err?.stack);
    // Expose the real message in all envs for debuggability (stack is still hidden in prod)
    message = err?.message || 'Internal Server Error';
  }

  // Development vs Production response
  const response: any = {
    status: 'error',
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err?.stack;
    response.detail = err?.message;
  }

  res.status(statusCode).json(response);
};
