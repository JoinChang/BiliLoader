// 运行在 Electron 主进程下的插件入口
const stealth = require("./modules/stealth/main.js");

exports.onBrowserWindowCreated = (window, { readConfig }) => {
  // 直播间隐身
  stealth.register(window, () => !!readConfig()["stealth-live"]);
};
