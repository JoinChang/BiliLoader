// 主进程 JS 执行（通过 entry.js 启动的 HTTP 调试服务）
const http = require("http");
const { text } = require("./utils.js");

function getDebugPort() {
  return parseInt(process.env.CDP_PORT || "9222", 10) + 1;
}

async function handleExecuteMainJs(args) {
  const { expression } = args;
  const port = getDebugPort();

  return new Promise((resolve) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      method: "POST",
      headers: { "Content-Type": "text/plain" },
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.ok) {
            const val = result.result;
            if (typeof val === "object" && val !== null) {
              resolve(text(JSON.stringify(val, null, 2)));
            } else {
              resolve(text(String(val ?? "undefined")));
            }
          } else {
            resolve(text(`错误: ${result.error}`));
          }
        } catch (e) {
          resolve(text(data || `连接失败: ${e.message}`));
        }
      });
    });

    req.on("error", (e) => {
      resolve(text(`无法连接主进程调试服务 (127.0.0.1:${port}): ${e.message}\n请确认已启用 MCP 调试服务器`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve(text("主进程执行超时"));
    });

    req.write(expression);
    req.end();
  });
}

module.exports = { handleExecuteMainJs };
