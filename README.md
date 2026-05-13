# Person AI Chat

一个最小化的 Next.js + NestJS 问答项目。前端负责输入问题并展示回答，后端预留 `POST /api/chat` 入口，后续可在 `ChatService` 中接入 AI 和向量数据库。

## 技术栈

- Monorepo: pnpm workspace
- 前端: Next.js App Router + TypeScript
- 后端: NestJS + TypeScript
- 部署: GitHub Actions 手动触发骨架，暂不自动部署

## 本地开发

```bash
pnpm install
pnpm dev
```

- 前端: http://localhost:3000
- 后端: http://localhost:3001
- 健康检查: http://localhost:3001/health

## 常用命令

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm build
pnpm lint
```

## 问答接口

请求:

```http
POST /api/chat
Content-Type: application/json
```

```json
{
  "question": "用户问题"
}
```

响应:

```json
{
  "answer": "后端 AI 能力尚未接入，请在 ChatService 中实现。"
}
```

后端业务入口位于 `apps/api/src/chat/chat.service.ts`。

## 上传接口

前端上传页面位于 `/upload`，会以 `multipart/form-data` 调用后端：

```http
POST /api/upload
```

字段:

- `files`: 一个或多个文件，支持图片、音频、PDF、Office 文档、文本等常见多模态输入
- `text`: 可选，直接提交的一段文字

当前前端会先请求 `GET /api/oss/signature` 获取 OSS POST V4 表单签名，再将文件和文字内容直传 OSS，最后调用 `POST /api/upload` 登记 object 信息。落库、向量化和 AI 分析入口位于 `apps/api/src/upload/upload.service.ts`。

OSS 相关环境变量参考 `apps/api/.env.example`。
