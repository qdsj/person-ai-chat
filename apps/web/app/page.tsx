"use client";

import { chat } from "@/api";
import { AlertCircle, Bot, LoaderCircle, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getMe, logout, type AuthUser } from "@/api";

export default function Home() {
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		let active = true;

		getMe()
			.then((payload) => {
				if (!active) {
					return;
				}

				if (!payload.user) {
					router.replace("/login?next=%2F");
					return;
				}

				setUser(payload.user);
			})
			.catch(() => {
				if (active) {
					router.replace("/login?next=%2F");
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

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedQuestion = question.trim();
		if (!trimmedQuestion) {
			setError("请输入问题后再发送。");
			setAnswer("");
			return;
		}

		setIsLoading(true);
		setError("");
		setAnswer("");

		try {
			const payload = await chat({ question: trimmedQuestion });
			setAnswer(payload.answer || "后端没有返回答案。");
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : "请求失败，请稍后重试。");
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
			<section className='workspace' aria-labelledby='page-title'>
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
					<h1 id='page-title'>向知识库提问</h1>
					<p>输入你的问题，后端会只在当前账号自己的知识库资料中检索并生成回答。</p>
					<div className='page-actions'>
						<Link href='/upload'>上传分析材料</Link>
					</div>
				</div>

				<div className='qa-grid'>
					<form className='question-panel' onSubmit={handleSubmit}>
						<label htmlFor='question'>问题</label>
						<textarea
							id='question'
							value={question}
							onChange={(event) => setQuestion(event.target.value)}
							placeholder='例如：这个项目的核心功能是什么？'
							rows={8}
							disabled={isLoading}
						/>
						<button type='submit' disabled={isLoading}>
							{isLoading ? (
								<LoaderCircle className='spin' size={18} aria-hidden='true' />
							) : (
								<Send size={18} aria-hidden='true' />
							)}
							<span>{isLoading ? "发送中" : "发送问题"}</span>
						</button>
					</form>

					<section className='answer-panel' aria-live='polite'>
						<div className='panel-heading'>
							<MessageCircle size={20} aria-hidden='true' />
							<h2>回答</h2>
						</div>

						{error ? (
							<div className='notice error'>
								<AlertCircle size={18} aria-hidden='true' />
								<p>{error}</p>
							</div>
						) : null}

						{answer ? <p className='answer-text'>{answer}</p> : null}

						{!answer && !error ? <p className='empty-state'>答案会显示在这里。</p> : null}
					</section>
				</div>
			</section>
		</main>
	);
}
