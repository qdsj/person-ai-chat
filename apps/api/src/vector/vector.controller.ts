import { Controller, Get, Post } from "@nestjs/common";
import { VectorService } from "./vector.service";

@Controller("vector")
export class VectorController {
	constructor(private readonly vectorService: VectorService) {}

	@Get("test")
	testContent() {
		return "ok";
	}
}
