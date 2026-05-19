import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VectorModule } from "src/vector/vector.module";
import { UploadRecord } from "./entities/upload-record.entity";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";

@Module({
	imports: [VectorModule, TypeOrmModule.forFeature([UploadRecord])],
	controllers: [UploadController],
	providers: [UploadService],
})
export class UploadModule {}
