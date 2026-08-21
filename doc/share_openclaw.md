share_openclaw_front
- 你当前 platform 是通过 proxy 把 /api/openclaw/* 转发到用户容器，入口在 platform/app/routes/proxy.py
- 当前每用户容器把 /root/.openclaw 挂成独立 volume，见 platform/app/container/manager.py
- OpenClaw 本身已经支持多 agent
- OpenClaw 的 session key 已经天然带 agent 前缀，格式类似：
  agent:<agentId>:...
  这个在 openclaw/src/routing/session-key.ts 里很明确
- 你的 simple_front 已经按 agent 维度处理 workspace 上传目录：
  main -> workspace/uploads
  其他 agent -> workspace-<agentId>/uploads
  见 simple_front/src/pages/Chat.tsx
- bridge 里也已经支持 agents/sessions/files 等 API，说明共享实例不是从 0 开始想象，而是已有基础能力


1. 逻辑隔离
- A 用户看不到 B 用户的 agent
- A 用户看不到 B 用户的 session
- A 用户上传的文件不进入 B 用户 workspace
- A 用户创建的知识库/技能/工作文件只属于自己


二、推荐的总体架构：双运行时模式

建议做成两条产品线共存：

A. dedicated mode
- 现有方案不动
- 每个用户一个容器
- 适合：
  - 重度工具调用
  - 终端/代码/长任务
  - 强隔离客户
  - ToB 高价值用户

B. shared mode
- 所有用户共用一个 openclaw shared container
- 每个用户只对应 shared runtime 里的一个 agent
- 每个 agent 有自己的 workspace
- 前端极简，只做对话/API
- 适合：
  - API 调用
  - 轻量聊天
  - simple_front 类体验
  - 低成本大规模用户

建议数据库层新增一个 runtime_mode 或 agent_backend_mode：

- user.runtime_mode = dedicated | shared
或者
- agent.runtime_mode = dedicated | shared




三、共享模式最关键的设计：不要让用户直接操作 OpenClaw 的原生多 Agent API

这个点很重要。

如果你直接把共享实例的 /api/agents、/api/sessions 全量暴露给前端，那么一定会出事，因为共享实例里会有所有用户的 agent/session。

正确做法是：

前端只请求 platform 的“用户隔离视图 API”
platform 再去调用 shared openclaw 的原生 API
然后 platform 做过滤、映射、重写

也就是说，新增一套 platform API，例如：

/api/shared-agent/me
/api/shared-agent/sessions
/api/shared-agent/sessions/{key}
/api/shared-agent/chat
/api/shared-agent/files/upload

前端 share_openclaw_front 只调这套，不要直接调 /api/openclaw/* 原始代理。



四、共享模式的数据模型建议

建议在 platform 增加几张表，最少需要一张映射表：

1. shared_runtime
记录共享 OpenClaw 实例
字段例如：
- id
- name
- docker_id / internal_host / internal_port
- status
- config_version

如果一开始就只有 1 个共享实例，也可以先不建这张表，写死配置；但从长期看建议有。


2. shared_agent_binding
用户和共享 Agent 的绑定关系
字段例如：
- id
- user_id
- runtime_id
- openclaw_agent_id
- workspace_dir
- mode
- created_at
- updated_at
- status

建议约束：
- user_id unique（如果一个用户只有一个共享 agent）
或者
- (user_id, logical_agent_name) unique（如果未来允许多个共享 agent）

3. 可选：shared_session_index
如果你想更快地列会话/审计/归档，可以做索引表
但第一版不一定需要，直接去 OpenClaw 拉 sessions 再按前缀过滤即可


五、共享模式下的命名规范：这是隔离成败的关键

必须统一约束。

1. shared agent id
不要直接用用户名，避免重名和泄漏
建议：
- u_<shortuuid>
或
- usr_<user_id_hash>

例如：
- usr_a1b2c3d4

2. workspace
必须固定为 agent 专属目录
例如：
- ~/.openclaw/workspace-usr_a1b2c3d4

你现在 simple_front 已经使用了 workspace-<agentId> 这套约定，这很好，直接沿用。

3. session key
必须全部落在这个 agent 名下
例如：
- agent:usr_a1b2c3d4:main
- agent:usr_a1b2c3d4:session-177xxxx
- agent:usr_a1b2c3d4:web:default

OpenClaw 现在 session key 机制本身就是 agent:<agentId>:...，这是天然优势。

六、platform 在共享模式里应该承担什么职责

platform 不再只是“反向代理”，而是“隔离控制器”。

核心职责有 6 个：

1. ensure shared agent exists
用户第一次进入 share_openclaw_front 或第一次 API 调用时：
- 查 shared_agent_binding
- 如果没有，就去 shared openclaw 创建 agent
- workspace 固定为 ~/.openclaw/workspace-<agentId>
- 创建绑定记录

2. 所有请求自动注入 agent 身份
例如：
- 列 sessions：只返回 agent:当前用户agent: 开头的会话
- 发消息：sessionKey 必须属于当前用户 agent
- 新建会话：平台自动生成当前 agent 的 session key
- 上传文件：upload_dir 固定到当前 agent workspace

3. 过滤 / 重写响应
例如 shared runtime 的 sessions.list 返回全量：
- platform 过滤只保留当前 agent
- 返回给前端时去掉底层实现细节

4. 阻止越权访问
任何传入的 agentId/sessionKey/path 都必须校验：
- agentId 必须等于当前用户绑定 agent
- sessionKey 必须以 agent:<bound_agent_id>: 开头
- upload_dir 必须在 workspace-<bound_agent_id> 下面

5. 统一配额与审计
因为共享实例会混在一起，所以配额统计必须回归 platform
你当前平台本来就做了 LLM 代理和用量记录，这一点很好，继续沿用。

6. 路由到 dedicated/shared 两种后端
建议在 platform 做一个 RuntimeRouter：
- dedicated -> 走现有 _container_url(db, user)
- shared -> 走 shared runtime url


七、我建议的最稳方案：共享模式下“每用户只给 1 个 Agent”

这和你说的目标完全一致，而且我认为是最适合第一阶段的。

不要一开始在共享模式里允许用户创建多个 agent。
因为一旦多个 agent：
- 前端管理复杂
- 绑定关系复杂
- 会话归属复杂
- 文件目录复杂
- 配额归属复杂
- 审计复杂

第一版共享模式建议就是：

每个用户在 shared runtime 中只有 1 个 agent
这个 agent：
- 一个固定身份
- 一个固定 workspace
- 多个 session
- 一个简单 chat UI
- 可选上传文件
- 可选简单知识库

这样 share_openclaw_front 就会非常像 simple_front，只是背后不是用户独占容器，而是共享实例中的“用户专属 Agent”。

八、你应该如何做 API 设计

我建议不要复用所有现有 /api/openclaw/*，而是新增一套“用户专属视图 API”。

建议如下：

1. 获取当前共享 Agent
GET /api/shared-openclaw/me
返回：
- agent_id
- display_name
- workspace_status
- runtime_mode
- model
- created_at

2. 列出我的会话
GET /api/shared-openclaw/sessions
平台内部：
- 调 shared runtime sessions.list
- 过滤 key 前缀 agent:<my_agent_id>:
- 返回前端简化结构

3. 获取我的某个会话
GET /api/shared-openclaw/sessions/{key}
校验：
- key 必须属于当前 agent

4. 发送消息
POST /api/shared-openclaw/chat
body:
- session_key 可空
- message
- attachments

平台逻辑：
- 如果没有 session_key，则自动生成当前 agent 的新 session
- 调 shared runtime chat.send
- deliver=false
- 返回 runId / result

5. 上传文件
POST /api/shared-openclaw/files/upload
平台逻辑：
- 不允许前端自传 upload_dir
- 平台自动写为 workspace-<agentId>/uploads
这样可以彻底避免路径注入

6. 可选：重命名/删除会话
PUT /api/shared-openclaw/sessions/{key}/title
DELETE /api/shared-openclaw/sessions/{key}

九、前端 share_openclaw_front 应该怎么设计

你的想法对，用一个新前端最合适。

因为它的定位和完整 frontend 不一样：
- 不要管理全平台
- 不要让用户看到 OpenClaw 的原生多 agent 界面
- 只做“我自己的助手”

页面建议只有这些：

1. 登录页
复用现有认证

2. Chat 主页面
左侧：
- 我的会话列表
右侧：
- 对话窗口
- 文件上传
- 新建会话
- 删除/重命名会话

3. 很轻的 Agent 设置页（可选）
只允许改一些安全字段：
- 名称
- emoji/avatar
- 默认模型（如果你允许）
不要暴露复杂技能、工具、cron、channels

第一版甚至可以不做设置页。

也就是说，share_openclaw_front 的 UX 可以直接参考 simple_front，但做三点改造：

- 不调用 listAgents()，因为共享模式下永远只有“当前用户自己的 agent”
- 不让用户自己选 agent
- 上传目录由后端决定，不让前端决定

十、隔离要怎么真正落地

这是重点。

共享实例最大的风险是“用户互相影响”，所以平台层必须硬性加这些规则。

1. 会话隔离
列 session 时只看：
- key.startswith(f"agent:{user_agent_id}:")
读/写/删 session 时都重复校验这个前缀

2. workspace 隔离
所有文件操作都只能落在：
- ~/.openclaw/workspace-<user_agent_id>

你现在 simple_front 只是前端约定 upload dir，这还不够。
必须后端再次强制。

3. agent 隔离
任何 agents.update / agents.files / agents.delete 都必须绑定到当前用户自己的 openclaw_agent_id
不要接受任意 agentId

4. Tool 隔离
如果共享模式要开工具，建议非常保守：
- 禁 terminal，至少第一版禁
- 禁系统级写操作
- 只保留必要工具：
  - read/write workspace 文件
  - 搜索 workspace 文件
  - 简单 web
  - 简单知识库
你仓库里能看到 OpenClaw 本身对 workspace-only 和 sandbox 是有相关能力的，但共享模式最好更保守，不要过度依赖“模型自觉”。

5. 配额隔离
共享模式下最容易出现：
- 某个用户超长上下文
- 某个用户疯狂 API 调用
所以平台必须继续做：
- 每用户日配额
- 并发限制
- 超时限制
- 请求体大小限制

6. 并发隔离
共享实例要加：
- 每用户并发 run 数限制，例如 1~3
- 全局共享运行时并发上限
否则一个用户可以拖住整个实例

十一、我对“兼容现有方案”的建议

最好不要改现有 frontend + proxy 的主逻辑，新增一条支路。

推荐做法：

1. dedicated 路线保持不动
- /api/openclaw/* 继续是 per-user container proxy
- 原 frontend 继续使用
- 已有用户无感

2. shared 路线新增
- /api/shared-openclaw/* 新接口
- /share 或新域名挂 share_openclaw_front
- 新用户可选使用 shared mode

3. 在平台里新增一个路由器层
例如：
- if user.runtime_mode == dedicated -> 走旧链路
- if user.runtime_mode == shared -> 走共享实例服务

这样你就能逐步灰度。

十二、我建议的内部模块拆分

可以把 platform 拆成这几个模块：

1. platform/app/shared_runtime/client.py
负责访问共享 openclaw bridge

2. platform/app/shared_runtime/manager.py
负责：
- ensure shared runtime alive
- ensure user shared agent exists
- create/update binding

3. platform/app/shared_runtime/guard.py
负责：
- session ownership 校验
- agent ownership 校验
- workspace path 校验

4. platform/app/routes/shared_openclaw.py
暴露给 share_openclaw_front 的 API

5. platform/app/services/runtime_router.py
统一判断 dedicated/shared

十三、创建共享 Agent 时建议写入什么配置

每个用户的共享 Agent 建议至少有这些属性：

- id: usr_xxx
- name: 用户昵称或平台生成名
- workspace: ~/.openclaw/workspace-usr_xxx
- identity.name: 用户 Agent 展示名
- model: 可选，默认继承平台
- skills: 建议共享模式下用白名单
- memorySearch: 可开，但只在当前 agent scope 内
- tools: 用共享模式专用白名单

如果你希望 API 外部调用稳定，建议每个共享 Agent 固定模板创建，不允许用户自己乱改 toolset。


十四、要不要让共享模式支持知识库/技能/定时任务？

我的建议：

第一阶段：
- 支持：会话、文件上传、简单知识库
- 暂不支持：cron、channels、复杂 skill 安装、插件管理、系统设置

原因很简单：
这些能力非常容易突破“用户互不影响”的边界。

尤其是：
- cron 会长期占共享实例
- channels 会引入账号级状态
- skills 安装可能写全局目录
- 插件配置可能影响全局实例

所以共享模式应该是“简化版 Agent 服务”，不是“完整 OpenClaw 控制台”。

十五、一个非常实用的折中方案：按用户等级自动分层

你可以以后这么卖：

- 免费/普通用户 -> shared mode
- 高级/企业用户 -> dedicated mode

这样：
- 成本低
- 架构统一
- 升级路径清晰

甚至可以做“从共享迁移到独占”：
- 保留 agent 逻辑数据
- 导出 workspace/session
- 切到 dedicated container

十六、你最需要注意的风险

1. 共享模式不能完全替代独占模式
如果用户能跑终端、改系统、起后台任务，共享模式一定风险大

2. 前端隔离不算隔离
必须平台强校验，不能相信前端传来的 agentId/sessionKey/upload_dir

3. 不要暴露共享实例原始 /agents 列表
否则直接泄漏

4. 不要允许自定义 workspace 路径
必须后端生成

5. 不要让共享 Agent 安装全局技能或改全局 config
否则互相污染

十七、我最推荐的实施路径

Phase 1：最小可用版
- 新增 shared runtime 容器 1 个
- 新增 shared_agent_binding 表
- 新增 /api/shared-openclaw/*
- 做 share_openclaw_front
- 每用户 1 shared agent
- 仅支持聊天、会话、上传
- 关闭高风险工具
- 不支持 channels/cron/plugins

Phase 2：增强隔离
- 增加并发限制
- 增加 per-user rate limit
- 增加 session/agent/path guard 中间件
- 增加 shared runtime 健康检查和自动恢复

Phase 3：混合商业化
- 用户可选 shared/dedicated
- 后台可一键迁移
- 前端按用户模式跳不同入口

十八、如果让我帮你定最终方案，我会这样选

最终建议：
“平台双模式 + 共享模式极简前端 + platform 强隔离代理”

一句话版：
保留现有每用户1容器方案不动；
新增一个 shared_openclaw_front，只面向“每用户1个共享 Agent”的场景；
由 platform 负责 user -> shared agent 的映射、session 前缀过滤、workspace 路径强约束、配额与并发控制；
共享模式只提供轻量对话/API，不开放高风险全局能力。

十九、给你一个简化架构图

现有模式：
frontend -> platform -> user container -> bridge -> openclaw

新增模式：
share_openclaw_front -> platform/shared routes -> shared bridge -> shared openclaw
                                           |
                                           +-> user_id 映射为 agent_id
                                           +-> 过滤 sessions
                                           +-> 限制 workspace
                                           +-> 统一配额/审计

二十、我对你项目最具体的实现建议

结合你现有代码，我建议直接这样落地：

1. 不改 platform/app/routes/proxy.py 的现有 dedicated 逻辑
2. 新建 platform/app/routes/shared_openclaw.py
3. 新建 shared runtime manager/client
4. 用数据库保存 user_id -> openclaw_agent_id -> workspace_dir
5. shared_openclaw_front 基于 simple_front 改：
   - 去掉 agent 选择
   - 去掉全局 Agent 列表
   - 所有 API 改调 /api/shared-openclaw/*
   - 上传目录不要再由前端传，改成后端决定
6. 共享模式只允许平台自动创建 Agent，不允许用户自建任意 Agent
7. 对 session key 做硬校验，必须属于当前 agent

如果你愿意，我下一步可以直接继续帮你做两件事之一：

1. 给你输出一份“详细实现设计文档”
- 包括数据库表结构
- 后端接口定义
- platform 模块拆分
- share_openclaw_front 页面结构
- 灰度迁移方案




1. 后端：新增 shared OpenClaw 模式
- 新增用户运行模式字段
  - platform/app/db/models.py
  - User.runtime_mode，默认 dedicated
- 新增共享 Agent 绑定表
  - SharedAgentBinding
  - 用来维护 user_id -> openclaw_agent_id -> workspace_dir
- 新增共享运行时服务层
  - platform/app/shared_runtime.py
  - 负责：
    - 校验 shared 模式是否启用
    - 为 shared 用户自动创建/获取共享 Agent
    - 生成 session key
    - 校验 session 归属
    - 上传文件到当前用户自己的 workspace
- 新增共享 API 路由
  - platform/app/routes/shared_openclaw.py
  - 提供：
    - GET /api/shared-openclaw/me
    - GET /api/shared-openclaw/sessions
    - GET /api/shared-openclaw/sessions/{key}
    - POST /api/shared-openclaw/chat
    - GET /api/shared-openclaw/runs/{run_id}/wait
    - PUT /api/shared-openclaw/sessions/{key}/title
^[[32;1R    - DELETE /api/shared-openclaw/sessions/{key}
    - POST /api/shared-openclaw/files/upload
- 主应用已挂载新路由
  - platform/app/main.py

2. 后端：隔离策略已经加上
- shared 用户不能再走原来的 /api/openclaw/* dedicated 代理链路
  - platform/app/routes/proxy.py
  - 如果 runtime_mode=shared，会返回 409，提示使用 /api/shared-openclaw
- shared 会话严格按前缀校验
  - 只能访问 agent:<当前用户共享agent>:... 的 session
- 文件上传不再信任前端传路径
  - 后端强制写到：
    - workspace-<agent_id>/uploads

3. 后端：配置和部署支持
- platform/app/config.py 新增配置：
  - PLATFORM_SHARED_OPENCLAW_ENABLED
  - PLATFORM_SHARED_OPENCLAW_URL
  - PLATFORM_SHARED_OPENCLAW_TIMEOUT_SECONDS
  - PLATFORM_SHARED_OPENCLAW_SYSTEM_TOKEN
- docker-compose.yml 新增：
  - shared-openclaw 服务
  - share-openclaw-front 服务
  - shared_openclaw_data volume
- gateway 环境变量也已补齐 shared runtime 相关配置

4. 管理后台：支持切换用户模式
- manage_front 已增加 runtime_mode 支持
- 管理页用户列表和编辑弹窗里可以看到/设置：
  - dedicated
  - shared
- 同时展示 shared_agent_id（如果已经创建）

5. 新前端：share_openclaw_front
- 新目录：
  - share_openclaw_front/
- 已实现：
  - 登录页
  - 共享聊天页
  - 会话列表
  - 新建会话
  - 重命名会话
  - 删除会话
  - 文件上传
- 该前端只面向“当前用户自己的共享 Agent”
- 不暴露多 agent 视图，符合你要的“simple_front 风格但用户互不影响”

验证情况

已完成的验证：
- platform/app compileall 通过
- share_openclaw_front 执行 npm install && npm run build 成功
- 说明新前端和新增后端文件至少在语法/构建层面是通的

你现在怎么用

1. 先构建 openclaw 基础镜像
- 你原来的步骤不变：
  docker build -f openclaw/Dockerfile.bridge -t openclaw:latest openclaw/

2. 启动服务
- docker compose up -d --build

3. 入口
- 完整前端（dedicated 模式）：http://localhost:3080
- 管理后台：http://localhost:3081
- simple_front：http://localhost:3082
- 共享前端 share_openclaw_front：http://localhost:3083

4. 切换用户到 shared 模式
- 进入管理后台
- 编辑用户
- 把 runtime_mode 改成 shared

5. 用户登录 3083
- 首次进入时会自动创建共享 Agent 绑定
- 后续所有会话和文件都会归到这个共享 Agent 下

重要说明

这一版已经满足你的主要目标：
- 兼容现有每用户1容器方案
- 新增共享1个 OpenClaw 的方案
- 每个用户在共享实例里只有自己的 Agent
- 每个 Agent 有自己的 workspace
- 前端是简化版，不暴露多用户互相影响的视图

但我也要明确说一个当前版本的边界：

当前 shared runtime 的 LLM 出口鉴权，我用了一个 shared system token
- 这样共享实例可以工作
- 但 LLM 代理层目前还不能像 dedicated 模式那样“按真实用户精确记 token usage”
- 也就是说：
  共享模式现在的“会话/文件/agent 隔离”已经做了
  但“LLM 用量精确到每个 shared 用户”这一层，现在还是第一版，不是最终版

这不影响你先把共享模式跑起来、做 API 服务和简化聊天入口。
如果你下一步要商业化计费或精确配额，我建议我继续帮你做第二阶段：

建议下一步继续做的 3 件事

1. shared 模式的精确配额/用量归属
- 把 shared runtime 发出的 LLM 请求进一步绑定到真实 platform user
- 这样 usage_records 才能真正按 shared 用户统计

2. shared 模式并发保护
- 每用户并发 run 限制
- 全局 shared runtime 并发上限
- 防止单个用户拖垮共享实例

3. shared 模式工具白名单
- 对 shared agent 明确限制高风险工具
- 比如先禁 terminal / 长任务 / 全局配置修改
- 只保留聊天、文件、轻量 workspace 能力



  ┌──────────────────────┬───────┬───────────────────────┐
  │ 服务                 │ 端口  │ 说明                  │
  ├──────────────────────┼───────┼───────────────────────┤
  │ postgres             │ 15432 │ 数据库                │
  │ gateway              │ 8080  │ 平台网关              │
  │ frontend             │ 3080  │ 用户前端              │
  │ simple-front         │ 3082  │ 简化版前端            │
  │ manage-front         │ 3081  │ 管理员前端            │
  │ shared-openclaw      │ 18080 │ 共享 OpenClaw 服务 ✨ │
  │ share-openclaw-front │ 3083  │ 共享前端 ✨           │
  └──────────────────────┴───────┴───────────────────────┘

- 从 share_openclaw_front 注册出来的新用户 -> runtime_mode=shared
- 从 share_openclaw_front 首次扫码登录创建出来的新用户 -> runtime_mode=shared
- 已存在的用户 -> 保持自己原来的 runtime_mode，不强改
