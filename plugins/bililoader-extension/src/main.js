// 运行在 Electron 主进程下的插件入口
const path = require("path");
const fs = require("fs");
const stealth = require("./modules/stealth/main.js");

let _configCache = null;
let _configMtime = 0;

function readPluginConfig() {
  try {
    const configPath = path.join(BiliLoader.path.data, "bililoader-extension", "config.json");
    const stat = fs.statSync(configPath);
    if (stat.mtimeMs !== _configMtime) {
      _configCache = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      _configMtime = stat.mtimeMs;
    }
    return _configCache;
  } catch (e) {
    return {};
  }
}

exports.onBrowserWindowCreated = (window) => {
  const config = readPluginConfig();

  // 直播间隐身
  if (config["stealth-live"]) {
    stealth.register(window, () => !!readPluginConfig()["stealth-live"]);
  }
};
