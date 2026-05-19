import { post, type ApiMessage } from "./http";

export type ChatRequest = {
	question: string;
};

export type ChatResponse = {
	answer?: string;
	message?: ApiMessage;
	error?: string;
};

export function chat(data: ChatRequest) {
	return post<ChatResponse, ChatRequest>("/api/chat", data, {
		errorMessage: "请求失败，请稍后重试。",
	});
}
