"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(16),
    JWT_EXPIRES_IN: zod_1.z.string().optional(),
    PORT: zod_1.z.coerce.number().default(4000),
    CORS_ORIGIN: zod_1.z.string().optional(),
});
function validateEnv(config) {
    const parsed = exports.envSchema.safeParse(config);
    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ");
        throw new Error(`Invalid environment configuration: ${issues}`);
    }
    return parsed.data;
}
//# sourceMappingURL=env.schema.js.map