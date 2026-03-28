const electron = require("electron");
const log = require("electron-log");
const path = require("path");
const pkg = require("../../package.json");

const { ensureDirectories, readConfig, writeConfig } = require("./config.js");
const { updateBiliLoader } = require("./updater.js");
const { getProfilePath } = require("./paths.js");

// 路径
const CORE_DIR = path.resolve(__dirname, "../..");
const BILILOADER_ROOT = path.resolve(CORE_DIR, "../..");
const BILILOADER_PROFILE = getProfilePath();

// 通用缓存
const _cache = new Map();

// BiliLoader 对象
const BiliLoader = {
  path: {
    root: CORE_DIR,
    home: BILILOADER_ROOT,
    profile: BILILOADER_PROFILE,
    data: path.join(BILILOADER_PROFILE, "data"),
    plugins: path.join(BILILOADER_PROFILE, "plugins"),
    builtinPlugins: path.join(BILILOADER_ROOT, "plugins"),
    config: path.join(BILILOADER_PROFILE, "config.json"),
  },
  versions: {
    bili_loader: pkg.version,
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  package: {
    get bilibili() { return require(path.join(process.resourcesPath, "app.asar", "package.json")); },
    bili_loader: pkg,
  },
  api: {
    readConfig,
    writeConfig,
    openExternal: (...args) => electron.shell.openExternal(...args),
    openFolder: (...args) => electron.shell.showItemInFolder(...args),
    relaunch: () => { electron.app.relaunch(); electron.app.quit(); },
    updateBiliLoader,
    setCache: (key, value) => _cache.set(key, value),
    getCache: (key) => _cache.get(key),
  },
  plugins: {},
};

// 初始化
ensureDirectories([
  BiliLoader.path.profile,
  BiliLoader.path.data,
  BiliLoader.path.plugins,
]);

globalThis.BiliLoader = BiliLoader;

// IPC 注册
const { ipcMain } = require("electron");

ipcMain.on("BiliLoader.BiliLoader.BiliLoader", (event) => {
  const { api, ...safeObj } = BiliLoader;
  event.returnValue = safeObj;
});

ipcMain.on("BiliLoader.readPluginConfig", (event, pluginId) => {
  event.returnValue = readConfig(pluginId);
});

// API 方法白名单
const API_WHITELIST = new Set([
  "readConfig", "writeConfig", "openExternal", "openFolder",
  "relaunch", "updateBiliLoader", "setCache", "getCache",
]);

ipcMain.handle("BiliLoader.BiliLoader.api", async (event, method, args) => {
  if (!API_WHITELIST.has(method)) {
    throw new Error(`不允许的 API 方法: ${method}`);
  }
  if (method === "writeConfig") {
    const targetId = args[0];
    const isFrameworkConfig = targetId === "" || targetId === null || targetId === undefined;
    const isRegisteredPlugin = targetId && BiliLoader.plugins[targetId];
    if (!isFrameworkConfig && !isRegisteredPlugin) {
      throw new Error("不允许写入未注册插件的配置");
    }
  }
  try {
    return await Promise.resolve(BiliLoader.api[method](...args));
  } catch (error) {
    log.error(`[BiliLoader] API 执行失败: ${method}`, error);
    throw new Error(error.message || String(error));
  }
});
