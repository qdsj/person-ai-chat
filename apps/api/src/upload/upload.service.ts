import { Injectable } from "@nestjs/common";
import { VectorService } from "src/vector/vector.service";

export type UploadedObjectSummary = {
	objectKey: string;
	originalName: string;
	mimeType: string;
	size: number;
	url?: string;
	source: "file" | "text";
};

export type CreateUploadInput = {
	objects: UploadedObjectSummary[];
	textLength: number;
};

export type UploadResult = {
	message: string;
	uploadId: string;
	fileCount: number;
	textLength: number;
	objects: UploadedObjectSummary[];
};

@Injectable()
export class UploadService {
	constructor(private readonly vectorService: VectorService) {}
	async createUpload(input: CreateUploadInput): Promise<UploadResult> {
		// 开始解析对应文件，将文件解析状态存至数据库中，前端可以通过url获取对应文件的解析状态
		// 直接返回前端上传状态，或者叫开始解析

		// 解析文件
		await this.startParsingFile(input.objects[0].url as string, input.objects[0].mimeType);

		return {
			message: "后端已收到 OSS 上传结果。落库、向量化和 AI 分析逻辑请在 UploadService 中实现。",
			uploadId: `pending-${Date.now()}`,
			fileCount: input.objects.length,
			textLength: input.textLength,
			objects: input.objects,
		};
	}

	private async startParsingFile(url: string, mimeType: string) {
		// 记录解析状态--开始
		console.log("开始解析文件");
		// 获取文件
		const fileBlob = await this.getFileBlob(url);
		// 记录解析状态--解析中
		// 开始解析
		if (!fileBlob) {
			return null;
		}

		// 存储文件
		await this.vectorService.storeFile(fileBlob, this.getFileType(mimeType));

		// 将解析后的文件存储向量数据库中
		// 记录解析状态--结束
		console.log("文件解析完成");
	}

	getFileType(mineType: string) {
		switch (true) {
			case mineType.includes("text/plain"):
				return "text";
			case mineType.includes("application/pdf"):
				return "pdf";
			default:
				return "text";
		}
	}

	// 记录解析结果
	private recodeParsingResult() {}

	// 获取解析状态
	getProcessingStatus() {}

	async getFileBlob(url: string) {
		try {
			// 获取url，拿到对应文件
			const response = await fetch(String(url));
			return response.blob();
		} catch (error) {
			console.log("获取文件失败", error);
			return null;
		}
	}
}
