import { post, type ApiMessage } from "./http";
import type { UploadedObject } from "./oss";

export type UploadResponse = {
	message?: ApiMessage;
	uploadId?: string;
	fileCount?: number;
	textLength?: number;
	objects?: UploadedObject[];
	error?: string;
};

export type CompleteUploadRequest = {
	objects: UploadedObject[];
	textLength: number;
};

export function completeUpload(data: CompleteUploadRequest) {
	return post<UploadResponse, CompleteUploadRequest>("/upload", data, {
		errorMessage: "登记上传结果失败。",
	});
}
