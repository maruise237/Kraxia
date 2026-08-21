# 环境变量设置
  1. OPENCLAW_SKIP_GMAIL_WATCHER=1
  跳过 Gmail 监听器启动
   - 当设置为 1 时，gateway 启动时不会启动 Gmail 监听器
   - Gmail 监听器用于监听 Gmail 账户的新邮件并触发相应的 hook
   - 如果没有配置 Gmail 账户或不需要邮件触发功能，可以跳过
   - 参考：src/hooks/gmail-watcher-lifecycle.ts:16

  2. OPENCLAW_SKIP_CRON=1
  跳过定时任务（Cron）启动
   - 当设置为 1 时，禁用 gateway 的定时任务功能
   - Cron 功能用于执行周期性任务（如定期检查、定时触发等）
   - 参考：src/gateway/server-cron.ts:153

  3. OPENCLAW_SKIP_CANVAS_HOST=1
  跳过 Canvas Host 启动
   - Canvas Host 是 OpenClaw 的画布宿主服务，用于托管可视化界面
   - 当设置为 1 时，不会启动 canvas host 服务
   - 如果不需要可视化画布功能或在受限环境中运行，可以跳过
   - 参考：src/canvas-host/server.ts:172

  4. OPENCLAW_SKIP_BROWSER_CONTROL_SERVER=1
  跳过浏览器控制服务器启动
   - 浏览器控制服务器用于远程控制浏览器（如自动化测试、网页抓取等）
   - 当设置为 1 时，不会启动浏览器控制服务
   - 参考：extensions/browser/src/plugin-service.ts:28

  5. OPENCLAW_DISABLE_BONJOUR=1
  禁用 Bonjour/mDNS 服务发现
   - Bonjour（mDNS）用于本地网络服务发现，让同一局域网的设备自动发现 OpenClaw gateway
   - 当设置为 1 时，禁用本地网络服务发现功能
   - 参考：src/infra/bonjour.ts:29
