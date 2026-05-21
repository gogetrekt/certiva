"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let AppExceptionFilter = class AppExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const normalized = this.normalizeException(exception);
        response.status(normalized.statusCode).json({
            statusCode: normalized.statusCode,
            message: normalized.message,
            error: normalized.error,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
    normalizeException(exception) {
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (exception.code === "P2002") {
                return {
                    statusCode: common_1.HttpStatus.CONFLICT,
                    error: "Conflict",
                    message: "A unique constraint would be violated by this request.",
                };
            }
            if (exception.code === "P2025") {
                return {
                    statusCode: common_1.HttpStatus.NOT_FOUND,
                    error: "Not Found",
                    message: "The requested record could not be found.",
                };
            }
        }
        if (exception instanceof common_1.HttpException) {
            const statusCode = exception.getStatus();
            const response = exception.getResponse();
            if (typeof response === "string") {
                return {
                    statusCode,
                    error: exception.name,
                    message: response,
                };
            }
            const body = response;
            return {
                statusCode,
                error: body.error ?? exception.name,
                message: Array.isArray(body.message) ? body.message.join(", ") : (body.message ?? exception.message),
            };
        }
        return {
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            error: "Internal Server Error",
            message: "An unexpected error occurred.",
        };
    }
};
exports.AppExceptionFilter = AppExceptionFilter;
exports.AppExceptionFilter = AppExceptionFilter = __decorate([
    (0, common_1.Catch)()
], AppExceptionFilter);
//# sourceMappingURL=app-exception.filter.js.map