import { Controller, Get, HttpStatus, UseGuards } from "@nestjs/common";
import { AuthGuard } from "src/auth/auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { AuthenticatedUser } from "src/auth/auth.types";
import { OssService } from "./oss.service";

@Controller()
export class OssController {
	constructor(private readonly ossService: OssService) {}

	@Get("oss")
	oss() {
		return {
			data: "oss",
		};
	}

	@Get(["api/oss/signature", "oss/getTempSignature"])
	@UseGuards(AuthGuard)
	async getTempSignature(@CurrentUser() user: AuthenticatedUser) {
		const params = await this.ossService.getTempSignature(user.id);
		return {
			status: HttpStatus.OK,
			message: "success",
			data: params,
		};
	}
}
