# TODO

## 1. 用户聊天内容记忆化（后续优化版本）

- [ ] 设计独立的用户记忆方案，不与现有 `pdf_collection` 混用。
- [ ] 新增用户记忆 collection，至少包含 `user_id`、`content`、`summary`、`memory_type`、`embedding`、`created_at`、`updated_at` 等字段。
- [ ] 补充记忆 collection 字段，增加 `session_id`、`source`、`confidence`、`last_accessed_at`，便于去重、更新与后续排序。
- [ ] 将记忆提取设计为问答后的独立步骤，不直接影响主回答链路。
- [ ] 先根据当前用户输入生成 embedding，并在该 `user_id` 下检索 topK 相近历史记忆，作为后续判断上下文。
- [ ] 在写入记忆前，基于 `user_id` 检索相近历史记忆，避免重复写入。
- [ ] 让模型基于“当前用户输入 + 相近历史记忆”共同判断，而不是只看当前这一轮输入。
- [ ] 只有当模型返回 `should_store = true` 或 `action !== "ignore"` 时，才进入后续写库流程，降低不必要的检索与写入开销。
- [ ] 在后端增加记忆结果校验逻辑，校验动作类型、必填字段、置信度等内容。
- [ ] 后端校验规则至少包括：`action` 是否合法、`memory_type` 是否在白名单内、`content` 是否为空、`confidence` 是否达到阈值。
- [ ] 当 `action = "update"` 时，校验 `matched_memory_id` 是否存在且属于当前 `user_id`。
- [ ] 当命中高相似旧记忆时，优先更新旧记录而不是重复插入，避免记忆库膨胀。
- [ ] 为记忆写入增加人工开关与阈值配置，例如是否启用记忆、最小相似度、最小置信度。
- [ ] 规划 `MemoryService.saveFromConversation()`，职责包括：检索相似记忆、调用模型判定、校验结构化结果、执行 insert/update/ignore。
- [ ] 规划 `MemoryService.searchUserMemories()`，用于在问答前按 `user_id` 检索相关长期记忆并拼接进上下文。
- [ ] 将记忆检索接入问答链路，在回答问题前先补充该用户的历史上下文。
- [ ] 控制注入问答上下文的记忆条数，避免把过多历史记忆塞进 prompt 导致噪声变大。
- [ ] 设计记忆摘要格式，优先向模型提供 `summary`，必要时再补充完整 `content`。
- [ ] 增加敏感信息过滤与人工配置开关，避免误存不该长期保留的用户内容。
- [ ] 补充端到端测试，覆盖“新记忆插入”“相似记忆更新”“低价值内容忽略”“敏感信息拒绝写入”等场景。

### 实现流程草案

```text
1. 用户发来消息
2. 用当前消息生成 embedding
3. 在 user_memory_collection 中按 user_id 检索 topK 相近记忆
4. 将“当前消息 + 相近记忆”交给大模型做记忆判定
5. 大模型输出结构化结果：insert / update / ignore
6. 后端校验 action、content、confidence、matched_memory_id 等字段
7. 校验通过后执行插入或更新
8. 问答链路在回答前检索该用户长期记忆，补充到上下文中
```

### 提示词规则示例

```text
你是一个“用户长期记忆提取器”。

你的任务是根据“当前用户输入”和“历史相近记忆”，判断是否需要写入新的用户记忆。

允许存储的信息：
- 长期稳定事实：身份、职业、技能背景、常住地
- 稳定偏好：回答风格、技术偏好、工作习惯
- 持续目标：长期项目、求职方向、正在推进的重要任务
- 反复出现的信息：多轮对话里持续相关的事实

禁止存储的信息：
- 一次性问题或临时上下文
- 当前这轮对话里短期有效的信息
- 未经用户确认的推测
- 敏感信息
- 低价值闲聊内容

输出要求：
- 只输出 JSON
- action 只能是 insert、update、ignore
- 如果与历史记忆重复或高度相似，优先输出 update 或 ignore
- 如果信息不适合长期保留，输出 ignore
```

### 结构化输出示例

```json
{
  "action": "insert",
  "memory_type": "preference",
  "content": "用户希望回答尽量简洁直接",
  "summary": "回答风格偏好：简洁直接",
  "confidence": 0.93,
  "matched_memory_id": null,
  "reason": "这是稳定偏好，后续多轮对话可复用"
}
```

```json
{
  "action": "update",
  "memory_type": "project",
  "content": "用户已打通页面提问、Milvus 检索、上传文字入库的链路",
  "summary": "Milvus 问答链路已贯通",
  "confidence": 0.9,
  "matched_memory_id": "312232812675600389",
  "reason": "这是对已有项目状态记忆的补充"
}
```

```json
{
  "action": "ignore",
  "memory_type": null,
  "content": "",
  "summary": "",
  "confidence": 0.88,
  "matched_memory_id": null,
  "reason": "这是一次性上下文，对后续帮助不大"
}
```

## 2. PDF 解析增强与引用出处输出

- [ ] 增强 PDF 解析能力，支持提取 PDF 中的图片内容。
- [ ] 增强 PDF 解析能力，支持提取 PDF 中的表格内容。
- [ ] 为图片和表格解析结果设计统一的数据结构，保留文本内容、类型、页码、文件名等元信息。
- [ ] 调整向量化入库逻辑，将普通文本、图片解析结果、表格解析结果统一写入可检索的知识库结构中。
- [ ] 确保每条入库内容都携带来源信息，至少包含 `pdf_name`、`page_number`、`chunk_type`。
- [ ] 调整检索返回结果格式，让问答阶段可以拿到命中的 PDF 名称和页码。
- [ ] 优化回答生成提示词，要求模型在回答末尾附上内容出处。
- [ ] 设计统一的出处展示格式，例如：`出处：xxx.pdf，第 3 页`。
- [ ] 当答案来自多个片段时，支持列出多个出处，避免来源丢失。
- [ ] 补充端到端测试，覆盖纯文本 PDF、含图片 PDF、含表格 PDF 的检索与回答链路。
