import { Module } from "@nestjs/common";
import { ChatModule } from "./chat/chat.module";
import { HealthController } from "./health/health.controller";
import { UploadModule } from "./upload/upload.module";
import { ConfigModule } from "@nestjs/config";
import { OssModule } from "./oss/oss.module";
import { VectorModule } from './vector/vector.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		ChatModule,
		UploadModule,
		OssModule,
		VectorModule,
	],
	controllers: [HealthController],
})
export class AppModule {}
