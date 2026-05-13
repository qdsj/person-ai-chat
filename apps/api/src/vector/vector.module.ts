import { Module } from "@nestjs/common";
import { VectorService } from "./vector.service";
import { VectorController } from "./vector.controller";
import { MilvusClientClass } from "./util/MilvusClient";
import { PdfCollection } from "./util/PdfCollection";
import { EmbeddingClient } from "./util/Embedding";

@Module({
	controllers: [VectorController],
	providers: [VectorService, MilvusClientClass, PdfCollection, EmbeddingClient],
	exports: [VectorService, MilvusClientClass],
})
export class VectorModule {}
