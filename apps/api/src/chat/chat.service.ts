import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Injectable } from "@nestjs/common";
import { AIClient } from "src/ai/AIClient";
import { MilvusClientClass } from "src/vector/util/MilvusClient";

export type ChatAnswer = {
	answer: string;
};

@Injectable()
export class ChatService {
	constructor(
		private readonly aiClient: AIClient,
		private readonly milvusClientClass: MilvusClientClass,
	) {}

	async ask(question: string) {
		const results = await this.milvusClientClass.searchPdfMilvus(question);
		const contents = results.map((item) => {
			return item.chunk_content;
		});

		const messages = [
			new SystemMessage(`
        你是个人知识库问答小助手，你只会根据下面的内容回答问题：
        ${contents.join("\n")}

        去掉AI味，回答像朋友一样
        `),
			new HumanMessage(question),
		];
		const response = await this.aiClient.invoke(messages);

		return {
			answer: response?.content || "",
			response,
		};
	}
}
