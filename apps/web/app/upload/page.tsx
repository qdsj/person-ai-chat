"use client";

import {
	completeUpload,
	getMe,
	getObjectUrl,
	getOssSignature,
	getUploadHistory,
	logout,
	uploadFileToOss,
	type AuthUser,
	type UploadHistoryItem,
	type UploadItem,
	type UploadResponse,
} from "@/api";
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
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

const ACCEPTED_FILE_TYPES = ["application/pdf", ".pdf", "text/plain", ".txt"].join(",");

function formatFileSize(size: number) {
	if (size < 1024) {
		return `${size} B`;
	}

	if (size < 1024 * 1024) {
		return `${(size / 1024).toFixed(1)} KB`;
	}

	return `${(size / 1024 / 1024).toFixed(1)} MB`;
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
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);
	const [files, setFiles] = useState<File[]>([]);
	const [text, setText] = useState("");
	const [error, setError] = useState("");
	const [result, setResult] = useState<UploadResponse | null>(null);
	const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
	const [isHistoryLoading, setIsHistoryLoading] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [fileInputKey, setFileInputKey] = useState(0);

	const ossPublicHost = useMemo(
		() => process.env.NEXT_PUBLIC_OSS_PUBLIC_HOST?.replace(/\/+$/, "") || "",
		[],
	);

	useEffect(() => {
		let active = true;

		getMe()
			.then((payload) => {
				if (!active) {
					return;
				}

				if (!payload.user) {
					router.replace("/login?next=%2Fupload");
					return;
				}

				setUser(payload.user);
			})
			.catch(() => {
				if (active) {
					router.replace("/login?next=%2Fupload");
				}
			})
			.finally(() => {
				if (active) {
					setIsAuthLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, [router]);

	useEffect(() => {
		if (!user) {
			return;
		}

		let active = true;
		setIsHistoryLoading(true);

		getUploadHistory()
			.then((payload) => {
				if (active) {
					setUploadHistory(payload.items || []);
				}
			})
			.catch((requestError) => {
				if (active) {
					setError(requestError instanceof Error ? requestError.message : "获取上传记录失败。");
				}
			})
			.finally(() => {
				if (active) {
					setIsHistoryLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, [user]);

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		setFiles(Array.from(event.target.files || []));
		setResult(null);
		setError("");
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
			const uploadedObjects = await Promise.all(
				uploadItems.map((item) =>
					uploadFileToOss({
						signature,
						item,
						publicHost: ossPublicHost,
					}),
				),
			);
			const payload = await completeUpload({
				objects: uploadedObjects,
				textLength: trimmedText.length,
			});
			setUploadHistory((currentHistory) => [...(payload.objects || []), ...currentHistory]);
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

	async function handleLogout() {
		await logout().catch(() => null);
		setUser(null);
		router.replace("/login");
	}

	if (isAuthLoading || !user) {
		return (
			<main className='page-shell'>
				<section className='workspace'>
					<p className='loading-copy'>正在校验登录状态...</p>
				</section>
			</main>
		);
	}

	return (
		<main className='page-shell'>
			<section className='workspace' aria-labelledby='upload-title'>
				<div className='intro'>
					<div className='product-mark'>
						<Bot size={22} aria-hidden='true' />
						<span>Person AI Chat</span>
					</div>
					<div className='session-banner'>
						<span>{user.name || user.email}</span>
						<button type='button' className='secondary-button' onClick={handleLogout}>
							退出登录
						</button>
					</div>
					<h1 id='upload-title'>上传分析材料</h1>
					<p>上传 PDF、文本文件，或直接粘贴一段文字。上传记录会写入 MySQL，并且只归属于当前账号。</p>
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

						{isHistoryLoading ? (
							<p className='empty-state compact'>正在加载你的上传记录...</p>
						) : uploadHistory.length > 0 ? (
							<ul className='file-list upload-result-list'>
								{uploadHistory.map((object) => (
									<li key={`${object.objectKey}-${object.uploadedAt}`} className='history-card'>
										<a
											href={object.url || getObjectUrl(ossPublicHost, object.objectKey)}
											target='_blank'
											rel='noreferrer'
											className='history-link'>
											<FileText size={17} aria-hidden='true' />
											<div className='file-meta'>
												<span>{object.originalName}</span>
												<span className='path-link'>
													{object.url || getObjectUrl(ossPublicHost, object.objectKey)}
												</span>
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
