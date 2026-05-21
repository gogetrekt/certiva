import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { JwtStrategy } from "../../common/strategies/jwt.strategy";
import { AppConfigService } from "../../config/app-config.service";
import { InstitutionModule } from "../institution/institution.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [
    PassportModule,
    InstitutionModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => {
        return {
          secret: configService.jwtSecret,
          signOptions: {
            expiresIn: configService.jwtExpiresIn as never,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
