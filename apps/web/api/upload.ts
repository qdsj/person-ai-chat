import { post, type ApiMessage } from "./http";
import type { UploadedObject } from "./oss";
import { get } from "./http";

export type UploadHistoryItem = UploadedObject & {
	id: number;
	uploadedAt: string;
};

export type UploadResponse = {
	message?: ApiMessage;
	uploadId?: string;
	fileCount?: number;
	textLength?: number;
	objects?: UploadHistoryItem[];
	error?: string;
};

export type CompleteUploadRequest = {
	objects: UploadedObject[];
	textLength: number;
};

export type UploadHistoryResponse = {
	items?: UploadHistoryItem[];
	error?: string;
};

export function completeUpload(data: CompleteUploadRequest) {
	return post<UploadResponse, CompleteUploadRequest>("/upload", data, {
		errorMessage: "登记上传结果失败。",
	});
}

export function getUploadHistory() {
	return get<UploadHistoryResponse>("/upload", {
		errorMessage: "获取上传记录失败。",
	});
}
