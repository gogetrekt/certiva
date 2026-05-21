"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configuration = void 0;
const configuration = () => ({
    app: {
        port: parseInt(process.env.PORT ?? "4000", 10),
        corsOrigin: process.env.CORS_ORIGIN ?? "",
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
    },
    database: {
        url: process.env.DATABASE_URL,
    },
    redis: {
        url: process.env.REDIS_URL,
    },
});
exports.configuration = configuration;
//# sourceMappingURL=configuration.js.map