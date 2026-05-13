import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MetricType, MilvusClient } from "@zilliz/milvus2-sdk-node";
import { EmbeddingClient } from "./Embedding";
import { PDF_COLLECTION_NAME } from "./const";

@Injectable()
export class MilvusClientClass {
	client: MilvusClient;
	constructor(
		private readonly embeddingClient: EmbeddingClient,
		private readonly configService: ConfigService,
	) {
		this.client = new MilvusClient({
			address: this.getRequiredConfig("MILVUS_ADDRESS"),
		});
	}

	async init() {
		await this.client.connectPromise;
	}

	// 查询milvus数据库
	async searchPdfMilvus(query: string) {
		try {
			const result = await this.client.search({
				collection_name: PDF_COLLECTION_NAME,
				anns_field: "vector",
				data: await Promise.all([this.embeddingClient.embeddingText(query)]),
				limit: 5,
				output_fields: ["chunk_content"],
				metric_type: MetricType.COSINE,
			});

			return result.results;
		} catch (error) {
			console.log("查询失败", error);
			return [];
		}
	}

	private getRequiredConfig(key: string) {
		const value = this.configService.get<string>(key);

		if (!value) {
			throw new InternalServerErrorException(`${key} 未配置。`);
		}

		return value;
	}
}
