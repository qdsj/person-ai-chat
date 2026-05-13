import { Document } from "@langchain/core/documents";
import { PDFLoader as LangChainPDFLoader } from "@langchain/community/document_loaders/fs/pdf";

type LangChainPDFLoaderOptions = NonNullable<ConstructorParameters<typeof LangChainPDFLoader>[1]>;

export interface CustomPDFLoaderOptions extends LangChainPDFLoaderOptions {
	contextWindow?: number;
}

const DEFAULT_CONTEXT_WINDOW = 200;

const getHead = (value: string, size: number) => value.slice(0, size).trim();

const getTail = (value: string, size: number) => value.slice(-size).trim();

export class CustomPDFLoader {
	private readonly loader: LangChainPDFLoader;
	private readonly contextWindow: number;

	constructor(
		filePathOrBlob: string | Blob,
		{ contextWindow = DEFAULT_CONTEXT_WINDOW, splitPages = true, ...loaderOptions }: CustomPDFLoaderOptions = {},
	) {
		this.contextWindow = contextWindow;
		this.loader = new LangChainPDFLoader(filePathOrBlob, {
			splitPages,
			...loaderOptions,
		});
	}

	async load() {
		const documents = await this.loader.load();

		return documents.map((document, index, allDocuments) => {
			const previousDocument = allDocuments[index - 1];
			const nextDocument = allDocuments[index + 1];
			const pageNumber = this.getPageNumber(document, index);
			const totalPages = this.getTotalPages(document, allDocuments.length);

			return new Document({
				id: document.id,
				pageContent: document.pageContent,
				metadata: {
					...document.metadata,
					source: document.metadata?.source,
					custom: {
						...(this.isRecord(document.metadata?.custom) ? document.metadata.custom : {}),
						pageNumber: pageNumber,
						totalPages: totalPages,
						contextWindow: this.contextWindow,
						prevPageNumber: previousDocument ? this.getPageNumber(previousDocument, index - 1) : null,
						nextPageNumber: nextDocument ? this.getPageNumber(nextDocument, index + 1) : null,
						prevPageTail: previousDocument ? getTail(previousDocument.pageContent, this.contextWindow) : "",
						nextPageHead: nextDocument ? getHead(nextDocument.pageContent, this.contextWindow) : "",
					},
				},
			});
		});
	}

	private getPageNumber(document: Document, index: number) {
		const pageNumber = document.metadata?.loc?.pageNumber;

		return typeof pageNumber === "number" ? pageNumber : index + 1;
	}

	private getTotalPages(document: Document, fallbackTotalPages: number) {
		const totalPages = document.metadata?.pdf?.totalPages;

		return typeof totalPages === "number" ? totalPages : fallbackTotalPages;
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
}

export default CustomPDFLoader;
