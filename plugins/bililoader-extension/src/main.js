// 运行在 Electron 主进程下的插件入口
const stealth = require("./modules/stealth/main.js");

exports.onBrowserWindowCreated = (window, { readConfig }) => {
  // 直播间隐身
  stealth.register(window, () => !!readConfig()["stealth-live"]);

  // 自定义 App 自动休眠时间
  if (typeof biliApp !== "undefined") {
    const fallAsleepTime = readConfig()["fall-asleep-time"];
    if (fallAsleepTime !== undefined) {
      biliApp.FALL_ASLEEP_TIME = fallAsleepTime === 0 ? Number.MAX_SAFE_INTEGER : fallAsleepTime;
    }
  }
};
