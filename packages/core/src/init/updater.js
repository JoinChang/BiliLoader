const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const { execFileSync } = require("child_process");
const log = require("electron-log");

const ALLOWED_HOSTS = ["github.com", "api.github.com", "codeload.github.com", "objects.githubusercontent.com"];
const MAX_REDIRECTS = 5;

function download(url, dest, redirects = 0) {
  if (redirects > MAX_REDIRECTS) {
    return Promise.reject(new Error("重定向次数过多"));
  }
  if (!url.startsWith("https://")) {
    return Promise.reject(new Error("仅支持 HTTPS 下载"));
  }
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "BiliLoader" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        validateUrl(res.headers.location);
        return download(res.headers.location, dest, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const file = fs.createWriteStream(dest);
      res.on("error", reject);
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
      file.on("error", reject);
    }).on("error", reject);
  });
}

function extractZip(zipPath, destDir) {
  if (process.platform === "win32") {
    execFileSync("powershell", [
      "-Command", "Expand-Archive",
      "-Path", zipPath,
      "-DestinationPath", destDir,
      "-Force",
    ], { timeout: 60000 });
  } else {
    execFileSync("unzip", ["-o", zipPath, "-d", destDir], { timeout: 60000 });
  }
}

function validateUrl(url) {
  try {
    const { hostname } = new URL(url);
    if (!ALLOWED_HOSTS.includes(hostname)) {
      throw new Error(`不允许的下载源: ${hostname}`);
    }
  } catch (e) {
    if (e.message.startsWith("不允许")) throw e;
    throw new Error(`无效的 URL: ${url}`);
  }
}

/**
 * 下载并准备更新，下次启动时应用
 */
async function updateBiliLoader(zipUrl) {
  validateUrl(zipUrl);

  const tmpDir = path.join(os.tmpdir(), "bililoader-update");
  const zipPath = path.join(tmpDir, "update.zip");
  const pendingDir = path.join(BiliLoader.path.profile, "pending-update");

  // 清理临时目录
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  // 下载
  log.info("[BiliLoader] 下载更新:", zipUrl);
  await download(zipUrl, zipPath);

  // 解压到临时目录
  log.info("[BiliLoader] 解压更新");
  const extractDir = path.join(tmpDir, "extracted");
  fs.mkdirSync(extractDir, { recursive: true });
  extractZip(zipPath, extractDir);

  // 校验解压结果：确保所有文件都在 extractDir 内
  function validateExtracted(dir) {
    const resolved = path.resolve(dir);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.resolve(dir, entry.name);
      if (!entryPath.startsWith(resolved + path.sep)) {
        throw new Error(`解压文件路径不合法: ${entryPath}`);
      }
      if (entry.isSymbolicLink()) {
        throw new Error(`不允许的符号链接: ${entryPath}`);
      }
      if (entry.isDirectory()) validateExtracted(entryPath);
    }
  }
  validateExtracted(extractDir);

  // GitHub zip 解压后有一层目录 (BiliLoader-tag/)
  const entries = fs.readdirSync(extractDir);
  const sourceDir = entries.length === 1 && fs.statSync(path.join(extractDir, entries[0])).isDirectory()
    ? path.join(extractDir, entries[0])
    : extractDir;

  // 移动到 pending-update 目录
  if (fs.existsSync(pendingDir)) fs.rmSync(pendingDir, { recursive: true });
  fs.cpSync(sourceDir, pendingDir, { recursive: true });

  // 清理临时目录
  fs.rmSync(tmpDir, { recursive: true });
  log.info("[BiliLoader] 更新已下载，将在下次启动时应用");
  return true;
}

/**
 * 启动时检查并应用待处理的更新
 */
function applyPendingUpdate(profilePath, homePath) {
  const pendingDir = path.join(profilePath, "pending-update");
  if (!fs.existsSync(pendingDir)) return false;

  try {
    const preserveDirs = ["node_modules"];
    const resolvedHome = path.resolve(homePath);

    for (const entry of fs.readdirSync(pendingDir)) {
      if (preserveDirs.includes(entry)) continue;
      const dest = path.join(homePath, entry);
      // 防止路径穿越
      if (!path.resolve(dest).startsWith(resolvedHome + path.sep)) continue;
      const src = path.join(pendingDir, entry);
      if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true });
      fs.cpSync(src, dest, { recursive: true });
    }

    fs.rmSync(pendingDir, { recursive: true });
    console.log("[BiliLoader] 更新已应用");
    return true;
  } catch (e) {
    console.error("[BiliLoader] 应用更新失败:", e.message);
    return false;
  }
}

module.exports = { updateBiliLoader, applyPendingUpdate };
