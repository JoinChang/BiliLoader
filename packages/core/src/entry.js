const { log } = require("./logger.js");
const fs = require("fs");
const path = require("path");
const { getProfilePath } = require("./init/paths.js");

const profilePath = getProfilePath();

// 检查并应用待处理的更新
const { applyPendingUpdate } = require("./init/updater.js");
const homePath = path.resolve(__dirname, "../..");
applyPendingUpdate(profilePath, homePath);

// 读取配置（仅读一次）
let globalConfig = {};
try {
  const configPath = path.join(profilePath, "config.json");
  if (fs.existsSync(configPath)) {
    globalConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch {}

// MCP 调试端口
if (globalConfig.enableMcpServer) {
  const { app } = require("electron");
  app.commandLine.appendSwitch("remote-debugging-port", String(globalConfig.mcpDebugPort || 9222));
  log(`MCP 调试端口已开启: ${globalConfig.mcpDebugPort || 9222}`);
}

// 初始化 BiliLoader 对象
log("初始化中...");
require("./init/main.js");

// 加载插件
const { loadPluginsIfEnabled } = require("./plugin_loader/manifest.js");
loadPluginsIfEnabled();

// 注入 BrowserWindow hook 和 Preload
require("./hooks/window.js");

// 主进程调试服务
if (globalConfig.enableMcpServer) {
  try {
    const debugPort = (globalConfig.mcpDebugPort || 9222) + 1;
    require("http").createServer((req, res) => {
      if (req.method !== "POST") { res.writeHead(405); res.end(); return; }
      let body = "";
      req.on("data", c => body += c);
      req.on("end", () => {
        res.setHeader("Content-Type", "application/json");
        try {
          globalThis.__require = require;
          const result = (0, eval)(body);
          Promise.resolve(result).then(val => {
            res.end(JSON.stringify({ ok: true, result: val }));
          }).catch(err => {
            res.end(JSON.stringify({ ok: false, error: err.message }));
          });
        } catch (e) {
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
    }).listen(debugPort, "127.0.0.1", () => {
      log(`主进程调试服务已启动: http://127.0.0.1:${debugPort}`);
    });
  } catch {}
}

// 打开主程序
log("正在启动客户端...");
require(path.join(process.resourcesPath, "app.asar", "_index.js"));
