import { Module } from "@nestjs/common";
import { VectorModule } from "src/vector/vector.module";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";

@Module({
	imports: [VectorModule],
	controllers: [UploadController],
	providers: [UploadService],
})
export class UploadModule {}
