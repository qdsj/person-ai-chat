import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Injectable } from "@nestjs/common";
import { AIClient } from "src/ai/AIClient";
import { MilvusClientClass } from "src/vector/util/MilvusClient";
import { VectorService } from "src/vector/vector.service";

export type ChatAnswer = {
	answer: string;
};

@Injectable()
export class ChatService {
	constructor(
		private readonly aiClient: AIClient,
		private readonly vectorService: VectorService,
		private readonly milvusClientClass: MilvusClientClass,
	) {}
	async ask(question: string) {
		void question;

		// TODO: 调用 AI 接口
		// 查询对应的向量数据库
		const results = await this.milvusClientClass.searchPdfMilvus(question);

		const contents = results.map((item) => {
			return item.chunk_content;
		});

		// 组装prompt，system message + user message
		const messages = [
			new SystemMessage(`
        你是个人知识库问答小助手，你只会根据下面的内容回答问题：
        ${contents.join("\n")}

        去掉AI味，回答像朋友一样
        `),
			new HumanMessage(question),
		];
		// 调用 AI 接口
		const response = await this.aiClient.invoke(messages);

		// 同时存储用户对话内容
		// 查询相近的内容
		// 将用户的问题和查询的内容一起提供给AI，然后告诉AI，这段内容是否有必要存储下来，同时告诉AI存储的标准，以及不存储的标准，并且强制AI格式化输出结果
		// 代码根据结果的判断，是否需要存储，如果需要存储，就调用代码存下来
		// 可以调用代码存，也可以调用tool来存

		return {
			answer: response?.content || "",
			response,
		};
	}
}
