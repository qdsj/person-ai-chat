export type ApiMessage = string | string[];

export type ApiErrorPayload = {
	message?: ApiMessage;
	error?: string;
};

type RequestBody = BodyInit | Record<string, unknown> | unknown[];

type RequestOptions = Omit<RequestInit, "body"> & {
	body?: RequestBody | null;
	errorMessage?: string;
};

const API_BASE_URL = (process.env.BASE_URL || "").replace(/\/+$/, "");

function isAbsoluteUrl(path: string) {
	return /^https?:\/\//i.test(path);
}

function resolveRequestUrl(path: string) {
	if (isAbsoluteUrl(path)) {
		return path;
	}

	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	if (!API_BASE_URL) {
		return normalizedPath;
	}

	return `${API_BASE_URL}${normalizedPath}`;
}

function isRawRequestBody(body: RequestBody) {
	return (
		typeof body === "string" ||
		body instanceof FormData ||
		body instanceof URLSearchParams ||
		body instanceof Blob ||
		body instanceof ArrayBuffer ||
		ArrayBuffer.isView(body)
	);
}

function buildRequestBody(body: RequestBody | null | undefined, headers: Headers) {
	if (body == null) {
		return undefined;
	}

	if (isRawRequestBody(body)) {
		return body;
	}

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	return JSON.stringify(body);
}

async function parseResponse<T>(response: Response): Promise<T | string | null> {
	if (response.status === 204) {
		return null;
	}

	const contentType = response.headers.get("content-type") || "";

	if (contentType.includes("application/json")) {
		return (await response.json()) as T;
	}

	const text = await response.text();
	return text || null;
}

export function getErrorMessage(payload: unknown, fallback: string) {
	if (typeof payload === "string") {
		return payload || fallback;
	}

	if (payload && typeof payload === "object") {
		const { message, error } = payload as ApiErrorPayload;

		if (Array.isArray(message)) {
			return message.join("，");
		}

		if (typeof message === "string" && message) {
			return message;
		}

		if (typeof error === "string" && error) {
			return error;
		}
	}

	return fallback;
}

export async function request<T>(path: string, options: RequestOptions = {}) {
	const { body, errorMessage = "请求失败，请稍后重试。", ...restOptions } = options;
	const headers = new Headers(restOptions.headers);
	const requestBody = buildRequestBody(body, headers);
	const response = await fetch(resolveRequestUrl(path), {
		...restOptions,
		headers,
		body: requestBody,
	});
	const payload = await parseResponse<T | ApiErrorPayload>(response);

	if (!response.ok) {
		throw new Error(getErrorMessage(payload, errorMessage));
	}

	return payload as T;
}

export function get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
	return request<T>(path, {
		...options,
		method: "GET",
	});
}

export function post<TResponse, TBody extends RequestBody = Record<string, unknown>>(
	path: string,
	body: TBody,
	options?: Omit<RequestOptions, "method" | "body">,
) {
	return request<TResponse>(path, {
		...options,
		method: "POST",
		body,
	});
}
