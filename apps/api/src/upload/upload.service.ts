import { BadRequestException, Injectable } from "@nestjs/common";
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
		for (const object of input.objects) {
			await this.startParsingObject(object);
		}

		return {
			message: "后端已收到上传内容，支持的文件已完成解析并写入知识库。",
			uploadId: `pending-${Date.now()}`,
			fileCount: input.objects.length,
			textLength: input.textLength,
			objects: input.objects,
		};
	}

	private async startParsingObject(object: UploadedObjectSummary) {
		const fileType = this.getFileType(object.mimeType);
		if (!fileType) {
			throw new BadRequestException(`暂不支持解析 ${object.originalName} 的文件类型：${object.mimeType}`);
		}

		if (!object.url) {
			throw new BadRequestException(`缺少 ${object.originalName} 的可访问地址，无法继续解析。`);
		}

		const fileBlob = await this.getFileBlob(object.url);
		if (!fileBlob) {
			return null;
		}

		await this.vectorService.storeFile(fileBlob, fileType);
		return true;
	}

	private getFileType(mimeType: string): "text" | "pdf" | null {
		switch (true) {
			case mimeType.includes("text/plain"):
				return "text";
			case mimeType.includes("application/pdf"):
				return "pdf";
			default:
				return null;
		}
	}

	private async getFileBlob(url: string) {
		try {
			const response = await fetch(String(url));
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return response.blob();
		} catch (error) {
			console.log("获取文件失败", error);
			return null;
		}
	}
}
