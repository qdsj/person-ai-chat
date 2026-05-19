import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	UploadedFiles,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "src/auth/auth.guard";
import type { AuthenticatedUser } from "src/auth/auth.types";
import { CurrentUser } from "src/auth/current-user.decorator";
import { UploadService, UploadedObjectSummary } from "./upload.service";

type CompleteUploadBody = {
	objects?: unknown;
	textLength?: unknown;
};

type UploadedFile = {
	originalname: string;
	mimetype: string;
	size: number;
	buffer: Buffer;
};

@Controller("api/upload")
@UseGuards(AuthGuard)
export class UploadController {
	constructor(private readonly uploadService: UploadService) {}

	@Get()
	async getHistory(@CurrentUser() user: AuthenticatedUser) {
		return {
			items: await this.uploadService.listUploads(user.id),
		};
	}

	@Post()
	async completeUpload(@CurrentUser() user: AuthenticatedUser, @Body() body: CompleteUploadBody = {}) {
		const objects = this.parseUploadedObjects(body.objects);
		const textLength = typeof body.textLength === "number" && body.textLength > 0 ? body.textLength : 0;

		if (objects.length === 0 && textLength === 0) {
			throw new BadRequestException("请先上传文件或输入文字。");
		}

		return this.uploadService.createUpload({
			userId: user.id,
			objects,
			textLength,
		});
	}

	@Post("server")
	@UseInterceptors(AnyFilesInterceptor())
	async serverUpload(
		@CurrentUser() user: AuthenticatedUser,
		@UploadedFiles() files: UploadedFile[] = [],
		@Body("text") text = "",
	) {
		const trimmedText = typeof text === "string" ? text.trim() : "";

		if (files.length === 0 && !trimmedText) {
			throw new BadRequestException("请上传文件或输入文字。");
		}

		return this.uploadService.createServerUpload({
			userId: user.id,
			files,
			text: trimmedText,
		});
	}

	private parseUploadedObjects(value: unknown): UploadedObjectSummary[] {
		if (!Array.isArray(value)) {
			return [];
		}

		const objects: UploadedObjectSummary[] = [];

		for (const item of value) {
			if (!item || typeof item !== "object") {
				continue;
			}

			const objectRecord = item as Partial<UploadedObjectSummary>;
			const source = objectRecord.source === "text" ? "text" : "file";

			if (
				typeof objectRecord.objectKey !== "string" ||
				!objectRecord.objectKey ||
				typeof objectRecord.originalName !== "string" ||
				!objectRecord.originalName
			) {
				continue;
			}

			objects.push({
				objectKey: objectRecord.objectKey,
				originalName: objectRecord.originalName,
				mimeType: typeof objectRecord.mimeType === "string" ? objectRecord.mimeType : "application/octet-stream",
				size: typeof objectRecord.size === "number" && objectRecord.size > 0 ? objectRecord.size : 0,
				url: typeof objectRecord.url === "string" ? objectRecord.url : undefined,
				source,
			});
		}

		return objects;
	}
}
