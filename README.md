# Person AI Chat

一个基于 `Next.js + NestJS + Milvus + DashScope` 的个人知识库问答项目。

当前已经打通的链路：

- 前端提问 -> 后端检索 Milvus -> 大模型生成回答
- 上传 PDF / TXT / 直接输入文字 -> 写入 Milvus 作为知识库语料
- OSS 直传签名 -> 上传结果回调后端 -> 后端解析并入库

后续优化计划统一记录在 [TODO.md](./TODO.md)。

## 技术栈

- Monorepo: `pnpm workspace`
- 前端: `Next.js App Router + TypeScript`
- 后端: `NestJS + TypeScript`
- 向量数据库: `Milvus`
- 模型接入: `LangChain + DashScope Compatible API`
- 文件上传: `Aliyun OSS STS + POST V4`

## 当前能力边界

- 问答基于 Milvus 检索结果生成回答
- 上传入口当前只支持：
  - `PDF`
  - `TXT / text/plain`
  - 页面中直接输入的一段文字
- 多文件上传已支持，后端会依次解析并入库
- PDF 图片解析、表格解析、答案出处引用、用户记忆化能力目前还未接入，规划见 [TODO.md](./TODO.md)

## 目录结构

```text
apps/
  api/   NestJS 后端
  web/   Next.js 前端
```

## 环境变量

### 1. 后端

复制示例文件：

```bash
cp apps/api/.env.example apps/api/.env
```

需要按实际环境填写：

- `MILVUS_ADDRESS`
- `OSS_ACCESS_KEY`
- `OSS_ACCESS_KEY_SECRET`
- `BUCKET_NAME`
- `OSS_STS_ROLE_ARN`
- `OSS_REGION`
- `ALI_YUN_AI_API_KEY`
- `ALI_YUN_AI_API_BASE_URL`
- `ALI_YUN_MODEL`
- `ALI_YUN_EMBEDDING_MODEL`

### 2. 前端

复制示例文件：

```bash
cp apps/web/.env.example apps/web/.env.local
```

需要按实际环境填写：

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_OSS_PUBLIC_HOST`

## 本地开发

```bash
pnpm install
pnpm dev
```

默认地址：

- 前端: [http://localhost:3000](http://localhost:3000)
- 后端: [http://localhost:3001](http://localhost:3001)
- 健康检查: [http://localhost:3001/health](http://localhost:3001/health)

## 常用命令

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm build
pnpm lint
```

## 主要接口

### 问答接口

```http
POST /api/chat
Content-Type: application/json
```

请求体：

```json
{
  "question": "这个知识库里提到了什么？"
}
```

响应示例：

```json
{
  "answer": "根据当前检索到的知识库内容，..."
}
```

### 获取 OSS 上传签名

```http
GET /api/oss/signature
```

### 上传结果回调

前端会先直传 OSS，再把对象信息回调到后端：

```http
POST /api/upload
Content-Type: application/json
```

请求体示例：

```json
{
  "objects": [
    {
      "objectKey": "uploads/xxx-demo.pdf",
      "originalName": "demo.pdf",
      "mimeType": "application/pdf",
      "size": 12345,
      "url": "https://your-public-oss-host.example.com/uploads/xxx-demo.pdf",
      "source": "file"
    }
  ],
  "textLength": 0
}
```

## 当前实现说明

- 前端问答页位于 [apps/web/app/page.tsx](./apps/web/app/page.tsx)
- 前端上传页位于 [apps/web/app/upload/page.tsx](./apps/web/app/upload/page.tsx)
- 后端问答入口位于 [apps/api/src/chat/chat.service.ts](./apps/api/src/chat/chat.service.ts)
- 后端上传解析入口位于 [apps/api/src/upload/upload.service.ts](./apps/api/src/upload/upload.service.ts)
- Milvus collection 初始化位于 [apps/api/src/vector/util/PdfCollection.ts](./apps/api/src/vector/util/PdfCollection.ts)

## 代码检查

```bash
pnpm lint
```

当前 `lint` 为 TypeScript 类型检查：

- `apps/api`: `tsc --noEmit`
- `apps/web`: `tsc --noEmit`
