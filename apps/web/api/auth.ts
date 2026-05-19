import { get, post, type ApiMessage } from "./http";

export type AuthUser = {
	id: number;
	email: string;
	name: string | null;
};

export type AuthResponse = {
	user?: AuthUser;
	message?: ApiMessage;
	error?: string;
};

export type AuthRequest = {
	email: string;
	password: string;
	name?: string;
};

export function register(data: AuthRequest) {
	return post<AuthResponse, AuthRequest>("/auth/register", data, {
		errorMessage: "注册失败，请稍后重试。",
	});
}

export function login(data: AuthRequest) {
	return post<AuthResponse, AuthRequest>("/auth/login", data, {
		errorMessage: "登录失败，请稍后重试。",
	});
}

export function getMe() {
	return get<AuthResponse>("/auth/me", {
		errorMessage: "获取登录信息失败。",
	});
}

export function logout() {
	return post<{ message?: ApiMessage }, Record<string, never>>("/auth/logout", {}, {
		errorMessage: "退出登录失败。",
	});
}
