import { Injectable } from "@nestjs/common";
import { DataType, IndexType, MetricType, MilvusClient } from "@zilliz/milvus2-sdk-node";
import { PDF_COLLECTION_NAME, VECTOR_DIM } from "./const";
import { MilvusClientClass } from "./MilvusClient";

@Injectable()
export class PdfCollection {
	client: MilvusClient;
	constructor(private milvusClientClass: MilvusClientClass) {
		this.client = this.milvusClientClass.client;
	}

	async create() {
		await this.client.createCollection(this.getCollectionConfig());
		await this.client.createIndex({
			collection_name: PDF_COLLECTION_NAME,
			field_name: "vector",
			index_type: IndexType.IVF_FLAT,
			metric_type: MetricType.COSINE,
			params: {
				nlist: 1024,
			},
		});
	}

	getCollectionConfig() {
		return {
			collection_name: PDF_COLLECTION_NAME,
			fields: [
				{ name: "id", data_type: DataType.Int64, is_primary_key: true },
				{ name: "user_id", data_type: DataType.VarChar, max_length: 64 },
				{ name: "vector", data_type: DataType.FloatVector, dim: VECTOR_DIM },
				{ name: "metadata", data_type: DataType.JSON },
				{ name: "object_key", data_type: DataType.VarChar, max_length: 1024 },
				{ name: "original_name", data_type: DataType.VarChar, max_length: 255 },
				{ name: "source", data_type: DataType.VarChar, max_length: 20 },
				{ name: "chunk_content", data_type: DataType.VarChar, max_length: 65535 },
				{ name: "created_at", data_type: DataType.Timestamptz },
			],
		};
	}

	getCollectionName() {
		return PDF_COLLECTION_NAME;
	}

	async checkCollectionExists() {
		const res = await this.client.hasCollection({ collection_name: PDF_COLLECTION_NAME });
		return res.value;
	}

	async loadCollection() {
		if (!(await this.checkCollectionExists())) {
			await this.create();
		}

		return this.client.loadCollection({ collection_name: PDF_COLLECTION_NAME });
	}
}
