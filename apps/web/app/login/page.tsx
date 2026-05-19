"use client";

import { getMe, login } from "@/api";
import { AlertCircle, Bot, LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const nextPath = searchParams.get("next") || "/";
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isChecking, setIsChecking] = useState(true);

	useEffect(() => {
		let active = true;

		getMe()
			.then((payload) => {
				if (active && payload.user) {
					router.replace(nextPath);
				}
			})
			.catch(() => null)
			.finally(() => {
				if (active) {
					setIsChecking(false);
				}
			});

		return () => {
			active = false;
		};
	}, [nextPath, router]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!email.trim() || !password.trim()) {
			setError("请输入邮箱和密码。");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			await login({
				email: email.trim(),
				password: password.trim(),
			});
			router.replace(nextPath);
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : "登录失败，请稍后重试。");
		} finally {
			setIsLoading(false);
		}
	}

	if (isChecking) {
		return (
			<main className='page-shell'>
				<section className='workspace'>
					<p className='loading-copy'>正在准备登录页...</p>
				</section>
			</main>
		);
	}

	return (
		<main className='page-shell'>
			<section className='workspace auth-workspace'>
				<div className='auth-panel'>
					<div className='product-mark'>
						<Bot size={22} aria-hidden='true' />
						<span>Person AI Chat</span>
					</div>
					<h1>登录</h1>
					<p className='auth-copy'>登录后才能访问你自己的上传记录和私有知识库。</p>

					<form className='auth-form' onSubmit={handleSubmit}>
						<label htmlFor='email'>邮箱</label>
						<input
							id='email'
							type='email'
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder='you@example.com'
							disabled={isLoading}
						/>

						<label htmlFor='password'>密码</label>
						<input
							id='password'
							type='password'
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder='至少 6 位'
							disabled={isLoading}
						/>

						{error ? (
							<div className='notice error'>
								<AlertCircle size={18} aria-hidden='true' />
								<p>{error}</p>
							</div>
						) : null}

						<button type='submit' disabled={isLoading}>
							{isLoading ? (
								<LoaderCircle className='spin' size={18} aria-hidden='true' />
							) : (
								<LogIn size={18} aria-hidden='true' />
							)}
							<span>{isLoading ? "登录中" : "登录"}</span>
						</button>
					</form>

					<div className='page-actions auth-actions'>
						<Link href='/register'>注册新账号</Link>
					</div>
				</div>
			</section>
		</main>
	);
}
