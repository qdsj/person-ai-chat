import { OpenAIEmbeddings } from "@langchain/openai";
import { ConfigService } from "@nestjs/config";
import { VECTOR_DIM } from "./const";
import { Injectable } from "@nestjs/common";

@Injectable()
export class EmbeddingClient {
	client: OpenAIEmbeddings;
	constructor(private readonly configService: ConfigService) {
		this.client = new OpenAIEmbeddings(this.getInitConfig());
	}

	async embeddingText(text: string) {
		try {
			const res = await this.client.embedQuery(text);
			return res;
		} catch (error) {
			console.log("文本向量化失败", text);
			throw error;
		}
	}

	getInitConfig() {
		return {
			apiKey: this.configService.get<string>("ALI_YUN_AI_API_KEY"),
			model: this.configService.get<string>("ALI_YUN_EMBEDDING_MODEL"),
			configuration: {
				baseURL: this.configService.get<string>("ALI_YUN_AI_API_BASE_URL"),
			},
			dimensions: VECTOR_DIM,
		};
	}
}
