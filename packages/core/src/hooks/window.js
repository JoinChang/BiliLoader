const { Module } = require("module");
const path = require("path");
const fs = require("fs");
const { getLogs, clearLogs } = require("../logger.js");
const { protocolRegister } = require("../protocol_scheme/main.js");
const { PluginMainLoader } = require("../plugin_loader/main.js");

const loader = new PluginMainLoader();
loader.initialize();

// 禁用 App 自动更新
function patchAutoUpdate() {
  if (typeof biliApp === "undefined") return false;
  try {
    const us = biliApp.updateService;
    const origCheck = us.checkForUpdate.bind(us);
    us.checkForUpdate = function (force) {
      if (force) return origCheck(force);
      this.eventsService.emitUpdateInfo({ isAvailable: false });
    };

    const searchPaths = [
      path.join(process.resourcesPath, "app.asar", "node_modules", "electron-updater"),
    ];
    try {
      const versionsDir = path.join(path.dirname(process.resourcesPath), "versions");
      const asarName = fs.readdirSync(versionsDir).find(f => f.endsWith(".asar"));
      if (asarName) searchPaths.unshift(path.join(versionsDir, asarName, "node_modules", "electron-updater"));
    } catch {}

    for (const p of searchPaths) {
      try { require(p).autoUpdater.autoDownload = false; break; } catch {}
    }
    return true;
  } catch { return false; }
}

// Hook BrowserWindow 创建
function observeNewBrowserWindow(callback) {
  const originalLoad = Module._load;
  Module._load = (...args) => {
    const loaded = originalLoad(...args);

    if (args[0] === "electron") {
      class HookedBrowserWindow extends loaded.BrowserWindow {
        constructor(config) {
          super({
            ...config,
            webPreferences: {
              ...config?.webPreferences,
              devTools: true,
              nodeIntegrationInSubFrames: true,
            }
          });

          callback(this);
        }
      }

      return {
        ...loaded,
        BrowserWindow: HookedBrowserWindow
      };
    }

    return loaded;
  };
}

// 监听窗口创建
observeNewBrowserWindow(window => {
  // F12 打开 DevTools
  window.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12" && input.type === "keyUp") {
      window.webContents.toggleDevTools();
    }
  });

  // 注册 local:// 协议
  protocolRegister(window.webContents.session.protocol);

  // 把日志发给渲染进程
  window.webContents.on("dom-ready", () => {
    for (const args of getLogs()) {
      window.webContents.send("BiliLoader.BiliLoader.log", ...args);
    }
    clearLogs();
  });

  // 注入 Preload 脚本
  window.webContents._getPreloadPaths = new Proxy(window.webContents._getPreloadPaths, {
    apply(target, thisArg, argArray) {
      return [
        ...Reflect.apply(target, thisArg, argArray),
        path.join(BiliLoader.path.root, "src/hooks/preload.js")
      ];
    }
  });

  // 禁用 App 自动更新
  const config = BiliLoader.api.readConfig();
  if (config.blockAppUpdate) {
    patchAutoUpdate()
  }

  // 通知插件加载器
  loader.onBrowserWindowCreated(window);
});
