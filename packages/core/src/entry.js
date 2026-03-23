const { log } = require("./logger.js");
const fs = require("fs");
const path = require("path");
const os = require("os");

// 读取配置，在初始化前开启远程调试端口
let profilePath = process.env["BILILOADER_PROFILE"];
if (!profilePath) {
  profilePath = process.platform === "win32"
    ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "BiliLoader")
    : path.join(os.homedir(), ".config", "BiliLoader");
}
try {
  const configPath = path.join(profilePath, "config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.enableMcpServer) {
      const port = config.mcpDebugPort || 9222;
      const { app } = require("electron");
      app.commandLine.appendSwitch("remote-debugging-port", String(port));
      log(`MCP 调试端口已开启: ${port}`);
    }
  }
} catch (e) {
  // 配置读取失败不影响启动
}

// 初始化 BiliLoader 对象
log("初始化中...");
require("./init/main.js");

// 加载插件配置
require("./plugin_loader/manifest.js");

// 注入 BrowserWindow hook 和 Preload
require("./hooks/window.js");

// 主进程调试服务（供 MCP Server 使用）
try {
  const configPath = path.join(profilePath, "config.json");
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};
  if (config.enableMcpServer) {
    const debugPort = (config.mcpDebugPort || 9222) + 1; // CDP 端口 + 1
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
  }
} catch (e) {
  // 启动失败不影响客户端
}

// 打开主程序（加载原始入口，避免循环引用）
log("正在启动客户端...");
require(require("path").join(process.resourcesPath, "app.asar", "_index.js"));
