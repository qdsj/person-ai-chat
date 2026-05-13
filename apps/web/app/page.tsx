"use client";

import { AlertCircle, Bot, LoaderCircle, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type ChatResponse = {
  answer?: string;
  message?: string | string[];
  error?: string;
};

const DEFAULT_API_BASE_URL = "http://localhost:3001";

function getErrorMessage(payload: ChatResponse, fallback: string) {
  if (Array.isArray(payload.message)) {
    return payload.message.join("，");
  }

  return payload.message || payload.error || fallback;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiBaseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  }, []);

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
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const payload = (await response.json()) as ChatResponse;

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "请求失败，请稍后重试。"));
      }

      setAnswer(payload.answer || "后端没有返回答案。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="workspace" aria-labelledby="page-title">
        <div className="intro">
          <div className="product-mark">
            <Bot size={22} aria-hidden="true" />
            <span>Person AI Chat</span>
          </div>
          <h1 id="page-title">向知识库提问</h1>
          <p>输入你的问题，后端会从向量数据库检索相关内容并生成回答。</p>
          <div className="page-actions">
            <Link href="/upload">上传分析材料</Link>
          </div>
        </div>

        <div className="qa-grid">
          <form className="question-panel" onSubmit={handleSubmit}>
            <label htmlFor="question">问题</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="例如：这个项目的核心功能是什么？"
              rows={8}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? (
                <LoaderCircle className="spin" size={18} aria-hidden="true" />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
              <span>{isLoading ? "发送中" : "发送问题"}</span>
            </button>
          </form>

          <section className="answer-panel" aria-live="polite">
            <div className="panel-heading">
              <MessageCircle size={20} aria-hidden="true" />
              <h2>回答</h2>
            </div>

            {error ? (
              <div className="notice error">
                <AlertCircle size={18} aria-hidden="true" />
                <p>{error}</p>
              </div>
            ) : null}

            {answer ? <p className="answer-text">{answer}</p> : null}

            {!answer && !error ? (
              <p className="empty-state">答案会显示在这里。</p>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
