import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "src/auth/auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { AuthenticatedUser } from "src/auth/auth.types";
import { ChatService } from "./chat.service";

type ChatRequestBody = {
  question?: unknown;
};

@Controller("api/chat")
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	@Post()
	@UseGuards(AuthGuard)
	async ask(@CurrentUser() user: AuthenticatedUser, @Body() body: ChatRequestBody) {
		if (typeof body.question !== "string" || !body.question.trim()) {
			throw new BadRequestException("question 不能为空。");
		}

		return this.chatService.ask(body.question.trim(), user.id);
	}
}
