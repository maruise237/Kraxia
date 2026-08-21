### 文件传输功能设计与实现总结

本次工作为 **Nanobot 平台新增完整的文件上传与下载能力**，支持：

* 用户在聊天中上传文件（≤50MB）
* Agent 分析文件内容
* Agent 生成新文件并作为聊天附件返回
* 文件管理页面统一查看与删除

---

## 一、整体架构方案

采用 **：独立文件 API + 消息引用**

架构流程：

```
Frontend (3080)
    ↓
Gateway (8080)
    ↓
Per-user Container (18080)
```

核心思想：

* 文件通过独立 HTTP API 上传/下载
* 聊天消息中通过 `attachments` 字段引用 `file_id`
* 文件存储在每个用户容器的 workspace volume 中
* Gateway 仅做透明代理，无需改动

优点：

* 上传与聊天解耦
* 文件可复用
* 不阻塞 WebSocket
* 不增加 Gateway 复杂度
* 天然用户隔离（每容器独立 volume）

---

## 二、文件存储设计

目录结构：

```
/workspace/files/<file_id>/
    metadata.json
    <original_file>
```

metadata 示例：

```json
{
  "id": "a1b2c3d4e5f6",
  "name": "report.pdf",
  "content_type": "application/pdf",
  "size": 1048576,
  "created_at": "...",
  "session_id": "web:default"
}
```

特性：

* UUID4 前 12 位作为 file_id
* 文件跟随 volume 生命周期
* 后续可扩展清理策略

---

## 三、后端实现

### 1️⃣ 文件 API（新增）

在 `server.py` 中新增：

* `POST /api/files/upload`
* `GET /api/files/{file_id}`
* `GET /api/files`
* `DELETE /api/files/{file_id}`

支持：

* multipart 上传
* 二进制透传
* image inline 展示
* 文件下载 attachment

---

### 2️⃣ WebSocket 与 HTTP Chat 支持 attachments

消息结构新增：

```json
{
  "type": "message",
  "content": "...",
  "attachments": [
    {
      "file_id": "...",
      "name": "...",
      "content_type": "...",
      "size": ...
    }
  ]
}
```

支持：

* 用户上传文件随消息发送
* Agent 输出文件作为附件返回
* Session 历史包含 attachments 字段

---

### 3️⃣ Agent 文件处理机制

输入：

* 图片 → Vision 模型处理
* 文本类文件 → 提取文本注入 Prompt
* 其他格式 → 存储但不解析

输出：

新增工具函数：

```
save_output_file()
```

用于：

* 生成 file_id
* 移动文件到 files 目录
* 写 metadata
* 在回复中引用附件

---

### 4️⃣ 安全增强

修复并加固：

* Path traversal 防护
* 文件名与 file_id 校验
* 输入合法性检查
* 认证图片加载（避免未授权访问）

---

## 四、前端实现

### 1️⃣ 聊天输入区增强

新增：

* 📎 附件按钮
* 上传进度条
* 待发送附件列表
* 发送时附带 file_id

---

### 2️⃣ 消息气泡附件渲染

* 图片 → 直接 inline 展示
* 其他文件 → 文件卡片 + 下载按钮

---

### 3️⃣ Files 管理页面

新增页面：

* 列表展示所有文件
* 支持 session 筛选
* 下载
* 删除

导航栏新增「文件」页签。

---

## 五、完整实施过程

共完成：

* 设计文档 1 份
* 实施计划 1 份
* 10 个任务
* 9+ commits
* 多轮 Spec Review + Code Review
* 修复 1 个 critical + 2 个重要问题

修改文件范围：

Backend：

* files.py
* server.py
* web.py

Frontend：

* types
* api.ts
* chat page
* files page
* header

---

## 六、最终能力

系统现在支持：

✅ 聊天上传文件
✅ Agent 读取并分析
✅ Agent 生成文件并返回
✅ 图片直接内嵌展示
✅ 文件管理页面
✅ 安全路径保护
✅ WebSocket + HTTP 双通道支持

---

## 七、架构成熟度评价

当前实现：

* 架构清晰
* 与现有系统高度解耦
* 安全性可控
* 易于扩展（后续可接 S3、对象存储）
* 不破坏 Gateway 的纯代理角色



下面是本次 **文件传输功能** 涉及的所有文件修改与新增文件清单，按 Backend / Frontend 分类说明。

---

# 一、Backend 变更

## ✅ 1️⃣ 新增文件

### `nanobot/web/files.py`

**作用：文件存储核心模块**

包含：

* 文件保存逻辑
* metadata.json 写入
* 文件列表读取
* 删除文件
* 路径安全校验（防 path traversal）
* file_id 校验

这是整个文件系统的底层支撑模块。

---

## ✅ 2️⃣ 修改文件

### `nanobot/web/server.py`

**改动最大文件**

新增：

* `POST /api/files/upload`
* `GET /api/files/{file_id}`
* `GET /api/files`
* `DELETE /api/files/{file_id}`

增强：

* WebSocket 消息支持 `attachments`
* HTTP Chat 接口支持 `attachments`
* Session history 返回 attachments
* 文件类型判断 inline / attachment
* 文件大小校验（≤50MB）

---

### `nanobot/channels/web.py`

**新增功能：**

* Outbound WebSocket 消息支持 `attachments`
* Agent 输出文件时自动附加到响应结构

---

# 二、Frontend 变更

## ✅ 1️⃣ 修改文件

### `frontend/types/index.ts`

新增：

```ts
export interface FileAttachment {
  file_id: string
  name: string
  content_type: string
  size?: number
}
```

更新：

* `ChatMessage` 增加 `attachments?: FileAttachment[]`

---

### `frontend/lib/api.ts`

新增：

* `uploadFile()`（支持进度回调）
* `listFiles()`
* `deleteFile()`
* `getFileUrl()`
* `sendRaw()`（支持 attachments）

增强：

* `sendMessage()` 支持 attachments
* WebSocket handler 支持附件字段

---

### `frontend/app/page.tsx`

新增：

* 📎 附件按钮
* 上传进度条 UI
* 待发送附件列表
* 消息气泡附件渲染
* 图片 inline 展示组件
* 文件卡片组件

这是聊天页面核心改造。

---

### `frontend/app/files/page.tsx`

**新增文件管理页面**

功能：

* 列出文件
* 下载
* 删除
* 按 session 筛选

---

### `frontend/components/Header.tsx`

新增：

* “文件”导航页签

---

# 三、提交记录概览

从基础版本开始，共新增：

* 1 个 backend 文件
* 1 个 frontend 页面
* 多个核心文件修改
* 10+ commits
* 修复若干安全问题

---

# 四、文件修改总览表

| 类型       | 文件                             | 变更类型 | 说明                        |
| -------- | ------------------------------ | ---- | ------------------------- |
| Backend  | nanobot/web/files.py           | 新增   | 文件存储核心模块                  |
| Backend  | nanobot/web/server.py          | 修改   | 文件 API + chat attachments |
| Backend  | nanobot/channels/web.py        | 修改   | WebSocket 支持附件            |
| Frontend | frontend/types/index.ts        | 修改   | 定义 FileAttachment         |
| Frontend | frontend/lib/api.ts            | 修改   | 上传/下载 API                 |
| Frontend | frontend/app/page.tsx          | 修改   | 聊天附件 UI                   |
| Frontend | frontend/app/files/page.tsx    | 新增   | 文件管理页面                    |
| Frontend | frontend/components/Header.tsx | 修改   | 新增文件页签                    |

---