import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { HealthController } from "./health/health.controller";
import { OssModule } from "./oss/oss.module";
import { UploadModule } from "./upload/upload.module";
import { VectorModule } from "./vector/vector.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				type: "mysql" as const,
				connectorPackage: "mysql2",
				host: configService.get<string>("DB_HOST"),
				port: Number(configService.get<string>("DB_PORT")),
				username: configService.get<string>("DB_USER"),
				password: configService.get<string>("DB_PASSWORD"),
				database: configService.get<string>("DB_NAME"),
				charset: "utf8mb4",
				autoLoadEntities: true,
				synchronize: true,
				logging: true,
			}),
		}),
		AuthModule,
		ChatModule,
		UploadModule,
		OssModule,
		VectorModule,
	],
	controllers: [HealthController],
})
export class AppModule {}
