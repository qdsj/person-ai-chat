import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VectorService } from "src/vector/vector.service";
import { UploadRecord } from "./entities/upload-record.entity";

export type UploadedObjectSummary = {
	objectKey: string;
	originalName: string;
	mimeType: string;
	size: number;
	url?: string;
	source: "file" | "text";
};

export type CreateUploadInput = {
	userId: number;
	objects: UploadedObjectSummary[];
	textLength: number;
};

type CreateServerUploadInput = {
	userId: number;
	files: Array<{
		originalname: string;
		mimetype: string;
		size: number;
		buffer: Buffer;
	}>;
	text: string;
};

export type UploadHistoryItem = UploadedObjectSummary & {
	id: number;
	uploadedAt: string;
};

export type UploadResult = {
	message: string;
	uploadId: string;
	fileCount: number;
	textLength: number;
	objects: UploadHistoryItem[];
};

@Injectable()
export class UploadService {
	constructor(
		private readonly vectorService: VectorService,
		@InjectRepository(UploadRecord)
		private readonly uploadRecordRepository: Repository<UploadRecord>,
	) {}

	async createUpload(input: CreateUploadInput): Promise<UploadResult> {
		for (const object of input.objects) {
			await this.startParsingObject(input.userId, object);
		}

		const records = await this.saveRecords(input.userId, input.objects);

		return {
			message: "后端已收到上传内容，支持的文件已完成解析并写入知识库。",
			uploadId: `pending-${Date.now()}`,
			fileCount: input.objects.length,
			textLength: input.textLength,
			objects: records.map((record) => this.toHistoryItem(record)),
		};
	}

	async createServerUpload(input: CreateServerUploadInput): Promise<UploadResult> {
		const objects: UploadedObjectSummary[] = input.files.map((file) => ({
			objectKey: this.createServerObjectKey(input.userId, file.originalname),
			originalName: file.originalname,
			mimeType: file.mimetype,
			size: file.size,
			source: "file",
		}));

		for (let index = 0; index < input.files.length; index += 1) {
			await this.startParsingBlob(input.userId, objects[index], new Blob([Uint8Array.from(input.files[index].buffer)]));
		}

		if (input.text) {
			const textObject: UploadedObjectSummary = {
				objectKey: this.createServerObjectKey(input.userId, `text-${Date.now()}.txt`),
				originalName: `text-${Date.now()}.txt`,
				mimeType: "text/plain;charset=utf-8",
				size: Buffer.byteLength(input.text, "utf8"),
				source: "text",
			};
			await this.startParsingBlob(input.userId, textObject, new Blob([input.text]));
			objects.unshift(textObject);
		}

		const records = await this.saveRecords(input.userId, objects);

		return {
			message: "后端已收到上传内容，支持的文件已完成解析并写入知识库。",
			uploadId: `pending-${Date.now()}`,
			fileCount: objects.length,
			textLength: input.text.length,
			objects: records.map((record) => this.toHistoryItem(record)),
		};
	}

	async listUploads(userId: number): Promise<UploadHistoryItem[]> {
		const records = await this.uploadRecordRepository.find({
			where: { userId },
			order: {
				createdAt: "DESC",
			},
		});

		return records.map((record) => this.toHistoryItem(record));
	}

	private async saveRecords(userId: number, objects: UploadedObjectSummary[]) {
		const records = objects.map((object) =>
			this.uploadRecordRepository.create({
				userId,
				objectKey: object.objectKey,
				originalName: object.originalName,
				mimeType: object.mimeType,
				size: object.size,
				url: object.url || "",
				source: object.source,
			}),
		);

		return this.uploadRecordRepository.save(records);
	}

	private async startParsingObject(userId: number, object: UploadedObjectSummary) {
		const fileType = this.getFileType(object.mimeType);
		if (!fileType) {
			throw new BadRequestException(`暂不支持解析 ${object.originalName} 的文件类型：${object.mimeType}`);
		}

		if (!object.url) {
			throw new BadRequestException(`缺少 ${object.originalName} 的可访问地址，无法继续解析。`);
		}

		const fileBlob = await this.getFileBlob(object.url);
		await this.startParsingBlob(userId, object, fileBlob);
		return true;
	}

	private async startParsingBlob(userId: number, object: UploadedObjectSummary, fileBlob: Blob | null) {
		if (!fileBlob) {
			return null;
		}

		const fileType = this.getFileType(object.mimeType);
		if (!fileType) {
			throw new BadRequestException(`暂不支持解析 ${object.originalName} 的文件类型：${object.mimeType}`);
		}

		await this.vectorService.storeFile(fileBlob, fileType, {
			userId: String(userId),
			objectKey: object.objectKey,
			originalName: object.originalName,
			source: object.source,
		});
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

	private toHistoryItem(record: UploadRecord): UploadHistoryItem {
		return {
			id: record.id,
			objectKey: record.objectKey,
			originalName: record.originalName,
			mimeType: record.mimeType,
			size: Number(record.size),
			url: record.url || undefined,
			source: record.source,
			uploadedAt: record.createdAt.toISOString(),
		};
	}

	private createServerObjectKey(userId: number, fileName: string) {
		const safeName = fileName.trim().replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-");
		return `server-upload/${userId}/${Date.now()}-${safeName || "upload"}`;
	}
}
