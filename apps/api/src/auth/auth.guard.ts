import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AUTH_COOKIE_NAME } from "./auth.constants";
import { AuthService } from "./auth.service";
import { getCookieValue } from "./cookie";

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private readonly authService: AuthService) {}

	async canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<{ headers: { cookie?: string }; user?: unknown }>();
		const token = getCookieValue(request.headers.cookie, AUTH_COOKIE_NAME);

		if (!token) {
			throw new UnauthorizedException("请先登录。");
		}

		const user = await this.authService.verifyToken(token).catch(() => null);
		if (!user) {
			throw new UnauthorizedException("登录态已失效，请重新登录。");
		}

		request.user = user;
		return true;
	}
}
