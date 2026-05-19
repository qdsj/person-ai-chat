import { get, getErrorMessage, type ApiMessage } from "./http";

export type OssSignature = {
	host: string;
	dir: string;
	policy: string;
	signature: string;
	x_oss_credential: string;
	x_oss_date: string;
	x_oss_signature_version: "OSS4-HMAC-SHA256";
	security_token: string;
};

export type OssSignatureResponse = {
	status?: number;
	message?: ApiMessage;
	data?: OssSignature;
	error?: string;
};

export type UploadSource = "file" | "text";

export type UploadItem = {
	file: File;
	source: UploadSource;
};

export type UploadedObject = {
	objectKey: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
	source: UploadSource;
};

function normalizeHost(host: string) {
	return host.replace(/\/+$/, "");
}

export function createObjectKey(dir: string, file: File) {
	const id =
		typeof crypto !== "undefined" && "randomUUID" in crypto
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	const safeName = file.name.trim().replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-");

	return `${dir}${id}-${safeName || "upload"}`;
}

export function getObjectUrl(host: string, objectKey: string) {
	return `${normalizeHost(host)}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

export async function getOssSignature() {
	const payload = await get<OssSignatureResponse>("/oss/signature", {
		errorMessage: "获取 OSS 上传签名失败。",
	});

	if (!payload.data) {
		throw new Error(getErrorMessage(payload, "获取 OSS 上传签名失败。"));
	}

	return payload.data;
}

export async function uploadFileToOss(params: {
	signature: OssSignature;
	item: UploadItem;
	publicHost?: string;
}): Promise<UploadedObject> {
	const { signature, item, publicHost } = params;
	const objectKey = createObjectKey(signature.dir, item.file);
	const formData = new FormData();

	formData.append("key", objectKey);
	formData.append("policy", signature.policy);
	formData.append("x-oss-signature-version", signature.x_oss_signature_version);
	formData.append("x-oss-credential", signature.x_oss_credential);
	formData.append("x-oss-date", signature.x_oss_date);
	formData.append("x-oss-security-token", signature.security_token);
	formData.append("x-oss-signature", signature.signature);
	formData.append("file", item.file);

	const response = await fetch(signature.host, {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		throw new Error(`${item.file.name} 上传到 OSS 失败。`);
	}

	return {
		objectKey,
		originalName: item.file.name,
		mimeType: item.file.type || "application/octet-stream",
		size: item.file.size,
		url: getObjectUrl(publicHost || signature.host, objectKey),
		source: item.source,
	};
}
