import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Injectable } from "@nestjs/common";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { MilvusClientClass } from "./util/MilvusClient";
import CustomPDFLoader from "./util/PDFLoader";
import { PdfCollection } from "./util/PdfCollection";
import { SnowflakeIdGenerator } from "./util/SnowflakeIdGenerator";
import { EmbeddingClient } from "./util/Embedding";
import { PDF_COLLECTION_NAME } from "./util/const";

type VectorRecordContext = {
	userId: string;
	objectKey: string;
	originalName: string;
	source: "file" | "text";
};

@Injectable()
export class VectorService {
	client: MilvusClient;
	collectionName: string;
	private readonly idGenerator = new SnowflakeIdGenerator(1n);
	constructor(
		private readonly milvusClientClass: MilvusClientClass,
		private readonly pdfCollection: PdfCollection,
		private readonly embeddingClient: EmbeddingClient,
	) {
		this.client = this.milvusClientClass.client;
		this.collectionName = PDF_COLLECTION_NAME;
	}

	async storeInit() {
		await this.client.connectPromise;
		await this.pdfCollection.loadCollection();
	}

	async storeTail(
		data:
			| {
					id: string;
					vector: number[];
					chunk_content: string;
					created_at: string;
					metadata: Record<string, unknown>;
			  }[]
			| Record<string, any>[],
	) {
		const insertResult = await this.client.insert({
			collection_name: PDF_COLLECTION_NAME,
			fields_data: data,
		});

		// 判断是否插入成功
		if (insertResult.status.error_code !== "Success") {
			throw new Error(`Milvus insert failed: ${insertResult.status.reason || insertResult.status.detail}`);
		}

		// 刷新数据
		await this.client.flush({
			collection_names: [PDF_COLLECTION_NAME],
		});
	}

	async storeFile(file: Blob, fileType: "text" | "pdf", context: VectorRecordContext) {
		await this.storeInit();
		// 判断
		let data;
		if (fileType === "text") {
			data = await this.getTextDocumentData(file, context);
		} else if (fileType === "pdf") {
			data = await this.getPdfDocumentData(file, context);
		}

		if (!data) return;

		await this.storeTail(data);
	}

	// 拆分pdf
	pdfLoader(file: Blob) {
		try {
			const loader = new CustomPDFLoader(file, {
				splitPages: true,
				contextWindow: 20,
			});
			return loader.load();
		} catch (error) {
			console.log("loader pdf error", error);
			return [];
		}
	}

	// 获取pdf document
	async getPdfDocumentData(file: Blob, context: VectorRecordContext) {
		const documents = await this.pdfLoader(file);

		const data = await Promise.all(
			documents.map(async (document) => {
				return {
					id: this.idGenerator.nextId(),
					user_id: context.userId,
					vector: await this.embeddingClient.embeddingText(document.pageContent),
					chunk_content: document.pageContent,
					created_at: new Date().toISOString(),
					object_key: context.objectKey,
					original_name: context.originalName,
					source: context.source,
					metadata: {
						...document.metadata,
						userId: context.userId,
						objectKey: context.objectKey,
						originalName: context.originalName,
						source: context.source,
					},
				};
			}),
		);

		return data;
	}

	// 获取文本 document
	async getTextDocumentData(file: Blob, context: VectorRecordContext) {
		const data = await this.textLoader(file);
		return Promise.all(
			data.map(async (item) => {
				return {
					id: this.idGenerator.nextId(),
					user_id: context.userId,
					vector: await this.embeddingClient.embeddingText(item.pageContent),
					chunk_content: item.pageContent,
					created_at: new Date().toISOString(),
					object_key: context.objectKey,
					original_name: context.originalName,
					source: context.source,
					metadata: {
						...item.metadata,
						userId: context.userId,
						objectKey: context.objectKey,
						originalName: context.originalName,
						source: context.source,
					},
				};
			}),
		);
	}

	// 拆分文本文件
	async textLoader(fileBlob: Blob) {
		try {
			const content = await fileBlob.text();
			const splitter = new RecursiveCharacterTextSplitter({
				chunkSize: 500,
				chunkOverlap: 100,
			});

			return splitter.createDocuments([content]);
		} catch (error) {
			console.log("loader text error", error);
			return [];
		}
	}
}
