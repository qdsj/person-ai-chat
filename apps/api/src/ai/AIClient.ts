import { BaseMessageLike, Message } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AIClient {
	client: ChatOpenAI;
	constructor(private readonly configService: ConfigService) {
		this.client = new ChatOpenAI({
			model: this.configService.get<string>("ALI_YUN_MODEL"),
			temperature: 0,
			configuration: {
				apiKey: this.configService.get<string>("ALI_YUN_AI_API_KEY"),
				baseURL: this.configService.get<string>("ALI_YUN_AI_API_BASE_URL"),
			},
		});
	}

	invoke(prompt: string | BaseMessageLike[]) {
		return this.client.invoke(prompt);
	}
}
