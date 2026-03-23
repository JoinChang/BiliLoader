#!/usr/bin/env node
/**
 * BiliLoader 安装脚本
 *
 * 用法:
 *   node scripts/install.js              — 自动查找客户端并注入
 *   node scripts/install.js --app <路径>  — 指定客户端安装目录
 *
 * 注入方式:
 *   1. 从原始 app.asar 解包（支持重复安装）
 *   2. 将原始 index.js 重命名为 _index.js
 *   3. 写入 bootstrap loader 作为新 index.js（不修改 package.json，避免完整性检查 012）
 *   4. 重新打包 app.asar
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const BILILOADER_HOME = path.resolve(__dirname, "..");
const CORE_DIR = path.join(BILILOADER_HOME, "packages", "core");
const DEFAULT_CONFIG = {
  enabled: true,
  blockAppUpdate: true,
  enableMcpServer: false,
  mcpDebugPort: 9222,
};

function log(msg) { console.log(`  ${msg}`); }
function step(msg) { console.log(`\n▸ ${msg}`); }

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", timeout: 120000, ...opts });
}

function findAppDir() {
  const argIdx = process.argv.indexOf("--app");
  if (argIdx !== -1 && process.argv[argIdx + 1]) {
    return path.join(process.argv[argIdx + 1], "resources", "app");
  }

  if (process.platform === "win32") {
    const regKeys = [
      "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\bilibili",
      "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\bilibili",
      "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\bilibili",
    ];
    for (const key of regKeys) {
      try {
        const str = execSync(
          `powershell -Command "(Get-ItemProperty -Path 'Registry::${key}' -ErrorAction Stop).UninstallString"`,
          { encoding: "utf-8", timeout: 5000 }
        ).trim();
        if (str) {
          const dir = path.join(path.dirname(str), "resources", "app");
          if (fs.existsSync(dir)) return dir;
        }
      } catch {}
    }
  }

  const candidates = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "bilibili"),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "bilibili"),
    "D:\\bilibili", "C:\\bilibili",
  ].filter(Boolean).map(d => path.join(d, "resources", "app"));

  return candidates.find(d => fs.existsSync(path.join(d, "package.json"))) || null;
}

function getProfileDir() {
  return process.platform === "win32"
    ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "BiliLoader")
    : path.join(os.homedir(), ".config", "BiliLoader");
}

function main() {
  console.log("\n  BiliLoader 安装脚本\n");

  // 查找客户端
  const appDir = findAppDir();
  if (!appDir) {
    console.error("  错误: 未找到哔哩哔哩客户端");
    console.error("  请使用 --app <路径> 指定安装目录（如 --app D:\\bilibili）\n");
    process.exit(1);
  }

  const resourcesDir = path.dirname(appDir);
  const asarPath = path.join(resourcesDir, "app.asar");
  const asarBackup = path.join(resourcesDir, "app.asar.original");

  log(`客户端  ${path.dirname(resourcesDir)}`);
  log(`核心    ${CORE_DIR}`);

  if (!fs.existsSync(path.join(CORE_DIR, "src", "entry.js"))) {
    console.error("\n  错误: 未找到核心文件，请确保 core/ 目录完整\n");
    process.exit(1);
  }

  // 安装核心依赖
  if (!fs.existsSync(path.join(CORE_DIR, "node_modules"))) {
    step("安装依赖");
    run("npm install --production", { cwd: CORE_DIR });
  }

  // 从原始 asar 解包
  step("解包 app.asar");
  const source = fs.existsSync(asarBackup) ? asarBackup : asarPath;
  if (source === asarBackup) log("使用已备份的原始 app.asar");
  run(`npx asar extract "${source}" "${appDir}"`);

  // 注入 bootstrap loader
  step("注入 Bootstrap loader");
  const indexPath = path.join(appDir, "index.js");
  const origIndexPath = path.join(appDir, "_index.js");
  fs.renameSync(indexPath, origIndexPath);

  const corePath = CORE_DIR.replace(/\\/g, "/");
  fs.writeFileSync(indexPath, [
    "// BiliLoader Bootstrap Loader",
    `const BILILOADER_CORE = "${corePath}";`,
    "try {",
    '    require(require("path").join(BILILOADER_CORE, "src", "entry.js"));',
    "} catch (e) {",
    '    console.error("[BiliLoader] 加载失败:", e.message);',
    '    require(require("path").join(process.resourcesPath, "app.asar", "_index.js"));',
    "}",
    "",
  ].join("\n"));
  log("index.js -> _index.js");

  // 备份并重新打包
  step("打包 app.asar");
  if (!fs.existsSync(asarBackup)) {
    fs.copyFileSync(asarPath, asarBackup);
    log("已备份原始 app.asar");
  }
  run(`npx asar pack "${appDir}" "${asarPath}" --unpack "*.node"`);

  // 创建数据目录和默认配置
  step("初始化数据目录");
  const profileDir = getProfileDir();
  for (const dir of [profileDir, path.join(profileDir, "data"), path.join(profileDir, "plugins")]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const configPath = path.join(profileDir, "config.json");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 4));
    log("已创建默认配置");
  }
  log(profileDir);

  console.log("\n  安装完成！重启客户端即可生效。\n");
}

main();
