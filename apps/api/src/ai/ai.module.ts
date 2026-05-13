import { Module } from "@nestjs/common";
import { AIClient } from "./AIClient";

@Module({
	providers: [AIClient],
	exports: [AIClient],
})
export class AIModule {}
