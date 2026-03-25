const fs = require("fs");
const path = require("path");
const log = require("electron-log");

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

function readConfig(pluginId) {
  const configPath = getConfigPath(pluginId);
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

function writeConfig(pluginId, config) {
  const configPath = getConfigPath(pluginId);
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    return true;
  } catch (e) {
    log.error(`[BiliLoader] 配置保存失败: ${e}`);
    return false;
  }
}

module.exports = { ensureDirectories, readConfig, writeConfig };
