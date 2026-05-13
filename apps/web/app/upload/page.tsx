"use client";

import {
	AlertCircle,
	Bot,
	CheckCircle2,
	Clock3,
	FileText,
	LoaderCircle,
	UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type OssSignature = {
	host: string;
	dir: string;
	policy: string;
	signature: string;
	x_oss_credential: string;
	x_oss_date: string;
	x_oss_signature_version: "OSS4-HMAC-SHA256";
	security_token: string;
};

type OssSignatureResponse = {
	status?: number;
	message?: string | string[];
	data?: OssSignature;
	error?: string;
};

type UploadedObject = {
	objectKey: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
	source: "file" | "text";
};

type UploadResponse = {
	message?: string | string[];
	uploadId?: string;
	fileCount?: number;
	textLength?: number;
	objects?: UploadedObject[];
	error?: string;
};

type UploadItem = {
	file: File;
	source: "file" | "text";
};

type UploadHistoryItem = UploadedObject & {
	echoPath: string;
	uploadedAt: string;
};

const UPLOAD_HISTORY_STORAGE_KEY = "person-ai-chat:upload-history";
const ACCEPTED_FILE_TYPES = ["application/pdf", ".pdf", "text/plain", ".txt"].join(",");

function getErrorMessage(payload: { message?: string | string[]; error?: string }, fallback: string) {
	if (Array.isArray(payload.message)) {
		return payload.message.join("，");
	}

	return payload.message || payload.error || fallback;
}

function formatFileSize(size: number) {
	if (size < 1024) {
		return `${size} B`;
	}

	if (size < 1024 * 1024) {
		return `${(size / 1024).toFixed(1)} KB`;
	}

	return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function createObjectKey(dir: string, file: File) {
	const id =
		typeof crypto !== "undefined" && "randomUUID" in crypto
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	const safeName = file.name.trim().replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-");

	return `${dir}${id}-${safeName || "upload"}`;
}

function getObjectUrl(host: string, objectKey: string) {
	return `${host}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

function getEchoPath(host: string, objectKey: string) {
	return getObjectUrl(host, objectKey);
}

function formatUploadedAt(value: string) {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

export default function UploadPage() {
	const [files, setFiles] = useState<File[]>([]);
	const [text, setText] = useState("");
	const [error, setError] = useState("");
	const [result, setResult] = useState<UploadResponse | null>(null);
	const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
	const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [fileInputKey, setFileInputKey] = useState(0);

	const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || "", []);
	const ossPublicHost = useMemo(
		() => process.env.NEXT_PUBLIC_OSS_PUBLIC_HOST?.replace(/\/+$/, "") || "",
		[],
	);

	useEffect(() => {
		const historyText = window.localStorage.getItem(UPLOAD_HISTORY_STORAGE_KEY);
		if (!historyText) {
			setHasLoadedHistory(true);
			return;
		}

		try {
			const parsed = JSON.parse(historyText) as UploadHistoryItem[];
			if (Array.isArray(parsed)) {
				setUploadHistory(parsed);
			}
		} catch {
			window.localStorage.removeItem(UPLOAD_HISTORY_STORAGE_KEY);
		} finally {
			setHasLoadedHistory(true);
		}
	}, []);

	useEffect(() => {
		if (!hasLoadedHistory) {
			return;
		}

		window.localStorage.setItem(UPLOAD_HISTORY_STORAGE_KEY, JSON.stringify(uploadHistory));
	}, [hasLoadedHistory, uploadHistory]);

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		setFiles(Array.from(event.target.files || []));
		setResult(null);
		setError("");
	}

	async function getOssSignature() {
		if (!apiBaseUrl) {
			throw new Error("缺少 NEXT_PUBLIC_API_BASE_URL 配置。");
		}

		const response = await fetch(`${apiBaseUrl}/api/oss/signature`);
		const payload = (await response.json()) as OssSignatureResponse;

		if (!response.ok || !payload.data) {
			throw new Error(getErrorMessage(payload, "获取 OSS 上传签名失败。"));
		}

		return payload.data;
	}

	async function uploadToOss(signature: OssSignature, item: UploadItem): Promise<UploadedObject> {
		const objectKey = createObjectKey(signature.dir, item.file);
		const formData = new FormData();

		formData.append("key", objectKey);
		formData.append("policy", signature.policy);
		formData.append("x-oss-signature-version", signature.x_oss_signature_version);
		formData.append("x-oss-credential", signature.x_oss_credential);
		formData.append("x-oss-date", signature.x_oss_date);
		formData.append("x-oss-security-token", signature.security_token);
		formData.append("x-oss-signature", signature.signature);
		formData.append("file", item.file);

		const response = await fetch(signature.host, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`${item.file.name} 上传到 OSS 失败。`);
		}

		return {
			objectKey,
			originalName: item.file.name,
			mimeType: item.file.type || "application/octet-stream",
			size: item.file.size,
			url: getObjectUrl(ossPublicHost || signature.host, objectKey),
			source: item.source,
		};
	}

	async function completeUpload(objects: UploadedObject[], textLength: number) {
		if (!apiBaseUrl) {
			throw new Error("缺少 NEXT_PUBLIC_API_BASE_URL 配置。");
		}

		const response = await fetch(`${apiBaseUrl}/api/upload`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				objects,
				textLength,
			}),
		});
		const payload = (await response.json()) as UploadResponse;

		if (!response.ok) {
			throw new Error(getErrorMessage(payload, "登记上传结果失败。"));
		}

		return payload;
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedText = text.trim();
		if (files.length === 0 && !trimmedText) {
			setError("请上传文件或输入一段文字。");
			setResult(null);
			return;
		}

		const uploadItems: UploadItem[] = files.map((file) => ({
			file,
			source: "file",
		}));

		if (trimmedText) {
			uploadItems.push({
				file: new File([trimmedText], `text-${Date.now()}.txt`, {
					type: "text/plain;charset=utf-8",
				}),
				source: "text",
			});
		}

		setIsLoading(true);
		setError("");
		setResult(null);

		try {
			const signature = await getOssSignature();
			const uploadedObjects = await Promise.all(uploadItems.map((item) => uploadToOss(signature, item)));
			const payload = await completeUpload(uploadedObjects, trimmedText.length);
				const uploadedAt = new Date().toISOString();
				const nextHistory = uploadedObjects.map((object) => ({
					...object,
					echoPath: getEchoPath(ossPublicHost || signature.host, object.objectKey),
					uploadedAt,
				}));

			setUploadHistory((currentHistory) => [...nextHistory, ...currentHistory]);
			setResult(payload);
			setFiles([]);
			setText("");
			setFileInputKey((current) => current + 1);
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : "上传失败，请稍后重试。");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<main className='page-shell'>
			<section className='workspace' aria-labelledby='upload-title'>
				<div className='intro'>
					<div className='product-mark'>
						<Bot size={22} aria-hidden='true' />
						<span>Person AI Chat</span>
					</div>
					<h1 id='upload-title'>上传分析材料</h1>
					<p>上传 PDF、文本文件，或直接粘贴一段文字，供后端写入知识库并参与问答。</p>
					<div className='page-actions'>
						<Link href='/'>返回问答</Link>
					</div>
				</div>

				<div className='upload-grid'>
					<form className='upload-panel' onSubmit={handleSubmit}>
						<label className='file-drop' htmlFor='files'>
							<UploadCloud size={32} aria-hidden='true' />
							<span>选择文件</span>
								<small>当前支持 PDF、TXT 文本文件，以及直接输入文字内容</small>
						</label>
						<input
							key={fileInputKey}
							id='files'
							className='file-input'
							type='file'
							accept={ACCEPTED_FILE_TYPES}
							multiple
							onChange={handleFileChange}
							disabled={isLoading}
						/>

						<label htmlFor='source-text'>文字内容</label>
						<textarea
							id='source-text'
							value={text}
							onChange={(event) => {
								setText(event.target.value);
								setResult(null);
								setError("");
							}}
							placeholder='也可以直接粘贴一段需要 AI 分析的文字。'
							rows={7}
							disabled={isLoading}
						/>

						<button type='submit' disabled={isLoading}>
							{isLoading ? (
								<LoaderCircle className='spin' size={18} aria-hidden='true' />
							) : (
								<UploadCloud size={18} aria-hidden='true' />
							)}
							<span>{isLoading ? "上传中" : "直传 OSS"}</span>
						</button>
					</form>

					<section className='answer-panel upload-summary' aria-live='polite'>
						<div className='panel-heading'>
							<FileText size={20} aria-hidden='true' />
							<h2>上传记录</h2>
						</div>

							<div className='format-list' aria-label='支持的内容类型'>
								<span>
									<FileText size={16} aria-hidden='true' />
									PDF
								</span>
								<span>
									<FileText size={16} aria-hidden='true' />
									TXT / 文字
								</span>
							</div>

						{files.length > 0 || text.trim() ? (
							<div className='pending-summary'>
								<p>
									本次待上传：{files.length} 个文件
									{text.trim() ? `，文字 ${text.trim().length} 字` : ""}
								</p>
							</div>
						) : null}

						{error ? (
							<div className='notice error'>
								<AlertCircle size={18} aria-hidden='true' />
								<p>{error}</p>
							</div>
						) : null}

						{result ? (
							<div className='notice success'>
								<CheckCircle2 size={18} aria-hidden='true' />
								<p>
									{result.message || "后端已收到上传结果。"} 对象 {result.fileCount ?? 0} 个，文字{" "}
									{result.textLength ?? 0} 字。
								</p>
							</div>
						) : null}

						{uploadHistory.length > 0 ? (
							<ul className='file-list upload-result-list'>
								{uploadHistory.map((object) => (
									<li key={`${object.objectKey}-${object.uploadedAt}`} className='history-card'>
										<a
											href={object.echoPath}
											target='_blank'
											rel='noreferrer'
											className='history-link'>
											<FileText size={17} aria-hidden='true' />
											<div className='file-meta'>
												<span>{object.originalName}</span>
												<span className='path-link'>{object.echoPath}</span>
												<div className='history-meta'>
													<span>{object.source === "text" ? "文字" : "文件"}</span>
													<span>{formatFileSize(object.size)}</span>
													<span className='history-time'>
														<Clock3 size={13} aria-hidden='true' />
														{formatUploadedAt(object.uploadedAt)}
													</span>
												</div>
											</div>
										</a>
									</li>
								))}
							</ul>
						) : (
							<p className='empty-state compact'>上传成功后的文件路径会记录在这里。</p>
						)}
					</section>
				</div>
			</section>
		</main>
	);
}
