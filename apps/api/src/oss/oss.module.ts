import { Module } from "@nestjs/common";
import { OssController } from "./oss.controller";
import { OssService } from "./oss.service";
import { AuthModule } from "src/auth/auth.module";

@Module({
	imports: [AuthModule],
	controllers: [OssController],
	providers: [OssService],
})
export class OssModule {}
