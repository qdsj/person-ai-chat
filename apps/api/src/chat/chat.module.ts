import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { AIModule } from "src/ai/ai.module";
import { VectorModule } from "src/vector/vector.module";

@Module({
	controllers: [ChatController],
	providers: [ChatService],
	imports: [AIModule, VectorModule],
})
export class ChatModule {}
