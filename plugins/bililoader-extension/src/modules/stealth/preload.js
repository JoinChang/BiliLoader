// 注入到页面上下文（在页面 JS 执行前）
const { webFrame } = require("electron");
const fs = require("fs");
const path = require("path");

try {
  const code = fs.readFileSync(path.join(__dirname, "inject.js"), "utf-8");
  webFrame.executeJavaScriptInIsolatedWorld(0, [{ code }]);
} catch {}
