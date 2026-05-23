import { BadRequestException, Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AUTH_COOKIE_NAME } from "./auth.constants";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import type { AuthenticatedUser } from "./auth.types";
import { CurrentUser } from "./current-user.decorator";

type AuthBody = {
	email?: unknown;
	password?: unknown;
	name?: unknown;
};

type ResponseWithCookieMethods = {
	cookie: (name: string, value: string, options: Record<string, unknown>) => void;
	clearCookie: (name: string, options: Record<string, unknown>) => void;
};

type SameSiteValue = "lax" | "strict" | "none";

@Controller("api/auth")
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
	) {}

	@Post("register")
	async register(@Body() body: AuthBody, @Res({ passthrough: true }) response: ResponseWithCookieMethods) {
		const payload = this.parseAuthBody(body, true);
		const result = await this.authService.register(payload);
		this.setAuthCookie(response, result.token);
		return {
			user: result.user,
		};
	}

	@Post("login")
	async login(@Body() body: AuthBody, @Res({ passthrough: true }) response: ResponseWithCookieMethods) {
		const payload = this.parseAuthBody(body, false);
		const result = await this.authService.login(payload);
		this.setAuthCookie(response, result.token);
		return {
			user: result.user,
		};
	}

	@Post("logout")
	logout(@Res({ passthrough: true }) response: ResponseWithCookieMethods) {
		this.clearAuthCookie(response);
		return {
			message: "已退出登录。",
		};
	}

	@Get("me")
	@UseGuards(AuthGuard)
	me(@CurrentUser() user: AuthenticatedUser) {
		return {
			user,
		};
	}

	private parseAuthBody(body: AuthBody, withName: boolean) {
		if (typeof body.email !== "string" || !body.email.trim()) {
			throw new BadRequestException("email 不能为空。");
		}

		if (typeof body.password !== "string" || body.password.trim().length < 6) {
			throw new BadRequestException("password 至少需要 6 位。");
		}

		return {
			email: body.email.trim(),
			password: body.password.trim(),
			name: withName && typeof body.name === "string" ? body.name.trim() : undefined,
		};
	}

	private setAuthCookie(response: ResponseWithCookieMethods, token: string) {
		response.cookie(AUTH_COOKIE_NAME, token, {
			httpOnly: true,
			...this.getCookieOptions(),
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});
	}

	private clearAuthCookie(response: ResponseWithCookieMethods) {
		response.clearCookie(AUTH_COOKIE_NAME, {
			httpOnly: true,
			...this.getCookieOptions(),
		});
	}

	private getCookieOptions() {
		const secure = this.getBooleanConfig("AUTH_COOKIE_SECURE", process.env.NODE_ENV === "production");
		const configuredSameSite = (this.configService.get<string>("AUTH_COOKIE_SAME_SITE") || "lax").toLowerCase();
		const sameSite = (["lax", "strict", "none"].includes(configuredSameSite)
			? configuredSameSite
			: "lax") as SameSiteValue;
		const domain = this.configService.get<string>("AUTH_COOKIE_DOMAIN")?.trim() || undefined;
		const path = this.configService.get<string>("AUTH_COOKIE_PATH")?.trim() || "/";

		return {
			secure,
			sameSite,
			path,
			...(domain ? { domain } : {}),
		};
	}

	private getBooleanConfig(key: string, defaultValue: boolean) {
		const rawValue = this.configService.get<string>(key);
		if (!rawValue) {
			return defaultValue;
		}

		return rawValue.toLowerCase() === "true";
	}
}
