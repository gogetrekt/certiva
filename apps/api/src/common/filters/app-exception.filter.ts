import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalizeException(exception);

    response.status(normalized.statusCode).json({
      statusCode: normalized.statusCode,
      message: normalized.message,
      error: normalized.error,
      path: request.url,
      timestamp: new Date().toISOString(),
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
      const response = exception.getResponse();

      if (typeof response === "string") {
        return {
          statusCode,
          error: exception.name,
          message: response,
        };
      }

      const body = response as {
        error?: string;
        message?: string | string[];
      };

      return {
        statusCode,
        error: body.error ?? exception.name,
        message: Array.isArray(body.message) ? body.message.join(", ") : (body.message ?? exception.message),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    };
  }
}
