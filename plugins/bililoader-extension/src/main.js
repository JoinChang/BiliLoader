// 运行在 Electron 主进程下的插件入口
const stealth = require("./modules/stealth/main.js");
const customCdn = require("./modules/custom-cdn/main.js");
const webRequestRouter = require("./modules/web_request_router/main.js");

exports.onBrowserWindowCreated = (window, { readConfig }) => {
  // 直播间隐身
  stealth.register(window, () => !!readConfig()["stealth-live"]);

  // 自定义 CDN 线路
  customCdn.register(readConfig);

  // webRequest 拦截
  webRequestRouter.register(window.webContents.session);

  // 自定义 App 自动休眠时间
  if (typeof biliApp !== "undefined") {
    const fallAsleepTime = readConfig()["fall-asleep-time"];
    if (fallAsleepTime !== undefined) {
      const value = fallAsleepTime === 0 ? Number.MAX_SAFE_INTEGER : fallAsleepTime;
      Object.defineProperty(biliApp, "FALL_ASLEEP_TIME", {
        get: () => value,
        set: () => {},
        configurable: true,
      });
    }
  }
};
