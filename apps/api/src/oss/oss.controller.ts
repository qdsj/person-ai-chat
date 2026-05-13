import { Controller, Get, HttpStatus } from "@nestjs/common";
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
	async getTempSignature() {
		const params = await this.ossService.getTempSignature();
		return {
			status: HttpStatus.OK,
			message: "success",
			data: params,
		};
	}
}
