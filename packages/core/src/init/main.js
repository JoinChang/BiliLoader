const electron = require("electron");
const log = require("electron-log");
const path = require("path");
const fs = require("fs");
const os = require("os");
const pkg = require("../../package.json");

let BILILOADER_PROFILE = process.env["BILILOADER_PROFILE"];
if (!BILILOADER_PROFILE) {
  BILILOADER_PROFILE = process.platform === "win32"
    ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "BiliLoader")
    : path.join(os.homedir(), ".config", "BiliLoader");
}

function ensureDirectories(paths) {
  for (const dir of paths) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log.info(`[BiliLoader] 创建目录: ${dir}`);
      }
    } catch (e) {
      log.error(`[BiliLoader] 创建目录失败: ${dir}`, e);
    }
  }
}

function getConfigPath(pluginId) {
  if (!pluginId) return BiliLoader.path.config;
  const plugin = BiliLoader.plugins[pluginId];
  ensureDirectories([plugin.path.data]);
  return path.join(plugin.path.data, "config.json");
}

function readConfig(configPath) {
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    if (configPath === BiliLoader.path.config) {
      return {
        enabled: true,
        blockAppUpdate: true,
        enableMcpServer: false,
        mcpDebugPort: 9222,
      };
    }
    return {};
  }
}

function writeConfig(configPath, config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    return true;
  } catch (e) {
    log.error(`[BiliLoader] 配置保存失败: ${e}`);
    return false;
  }
}

// 通用缓存对象
const _cache = new Map();

function setCache(key, value) {
  _cache.set(key, value);
}

function getCache(key) {
  return _cache.get(key);
}

// BiliLoader 对象
const BiliLoader = {
  path: {
    root: path.join(__dirname, "..", ".."),
    profile: BILILOADER_PROFILE,
    data: path.join(BILILOADER_PROFILE, "data"),
    plugins: path.join(BILILOADER_PROFILE, "plugins"),
    builtinPlugins: path.join(__dirname, "..", "..", "..", "..", "plugins"),
    config: path.join(BILILOADER_PROFILE, "config.json"),
  },
  versions: {
    bili_loader: pkg.version,
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  package: {
    get bilibili() { return require(path.join(process.resourcesPath, "app.asar", "package.json")); },
    bili_loader: pkg
  },
  api: {
    readConfig: (pluginId) => readConfig(getConfigPath(pluginId)),
    writeConfig: (pluginId, config) => writeConfig(getConfigPath(pluginId), config),
    openExternal: (...args) => electron.shell.openExternal(...args),
    openFolder: (...args) => electron.shell.showItemInFolder(...args),
    relaunch: () => { electron.app.relaunch(); electron.app.quit(); },
    setCache,
    getCache,
  },
  plugins: {}
};

// 创建目录
ensureDirectories([
  BiliLoader.path.profile,
  BiliLoader.path.data,
  BiliLoader.path.plugins
]);

// 挂载到主进程全局
globalThis.BiliLoader = BiliLoader;

// 挂载到渲染进程 window（延迟到 ipcMain 可用时注册）
function registerIpc() {
  const { ipcMain } = require("electron");
  ipcMain.on("BiliLoader.BiliLoader.BiliLoader", (event) => {
    event.returnValue = {
      ...BiliLoader,
      api: void null
    }
  });

  ipcMain.handle("BiliLoader.BiliLoader.api", async (event, method, args) => {
    try {
      return await Promise.resolve(BiliLoader.api[method](...args));
    } catch (error) {
      log.error(`[BiliLoader] API 执行失败: ${method}`, error);
      return null;
    }
  });
}

registerIpc();
