import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import type { AppConfigService } from "../../config/app-config.service";

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  constructor(private readonly configService: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalizeException(exception);

    // Log unexpected 500s server-side with safe request context only.
    // HttpExceptions (4xx, known errors) are not logged here — they are expected.
    if (normalized.statusCode >= 500) {
      const safeCtx: Record<string, unknown> = {
        method: request.method,
        path: request.path,
        statusCode: normalized.statusCode,
      };

      // Include authenticated actor id if present — never the token itself
      const user = (request as Request & { user?: { sub?: string } }).user;
      if (user?.sub) {
        safeCtx.actorId = user.sub;
      }

      // Include IP only — already safely resolved by trust-proxy setting
      const ip = request.ip;
      if (ip) {
        safeCtx.ip = ip;
      }

      const message =
        exception instanceof Error ? exception.message : String(exception);

      // Stack is logged server-side only, never forwarded to client
      if (exception instanceof Error && exception.stack) {
        this.logger.error(
          `Unhandled exception [${normalized.statusCode}] ${message}`,
          exception.stack,
          JSON.stringify(safeCtx),
        );
      } else {
        this.logger.error(
          `Unhandled exception [${normalized.statusCode}] ${message}`,
          JSON.stringify(safeCtx),
        );
      }
    }

    response.status(normalized.statusCode).json({
      statusCode: normalized.statusCode,
      message: normalized.message,
      error: normalized.error,
    });
  }

  private normalizeException(exception: unknown) {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        return {
          statusCode: HttpStatus.CONFLICT,
          error: "Conflict",
          message: "A unique constraint would be violated by this request.",
        };
      }

      if (exception.code === "P2025") {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: "Not Found",
          message: "The requested record could not be found.",
        };
      }
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        return {
          statusCode,
          error: exception.name,
          message: exceptionResponse,
        };
      }

      const body = exceptionResponse as {
        error?: string;
        message?: string | string[];
      };

      return {
        statusCode,
        error: body.error ?? exception.name,
        message: Array.isArray(body.message)
          ? body.message.join(", ")
          : (body.message ?? exception.message),
      };
    }

    // Unexpected 500: suppress details in staging/production response
    if (this.configService.isExposedEnv) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: "Internal Server Error",
        message: "An unexpected error occurred.",
      };
    }

    // Development: include class name to aid debugging, but never the full stack
    const name =
      exception instanceof Error ? exception.constructor.name : "UnknownError";
    const message =
      exception instanceof Error
        ? exception.message
        : "An unexpected error occurred.";

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: name,
      message,
    };
  }
}
