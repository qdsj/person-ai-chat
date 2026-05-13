import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";

type ChatRequestBody = {
  question?: unknown;
};

@Controller("api/chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async ask(@Body() body: ChatRequestBody) {
    if (typeof body.question !== "string" || !body.question.trim()) {
      throw new BadRequestException("question 不能为空。");
    }

    return this.chatService.ask(body.question.trim());
  }
}
