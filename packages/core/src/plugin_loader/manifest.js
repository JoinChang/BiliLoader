const fs = require("fs");
const path = require("path");
const { log } = require("../logger.js");

// 获取插件目录路径列表
function getPluginPaths(basePath) {
  if (!fs.existsSync(basePath)) {
    log("插件目录不存在，正在创建:", basePath);
    try {
      fs.mkdirSync(basePath, { recursive: true });
      log("插件目录创建成功。");
    } catch (err) {
      log("插件目录创建失败:", err.message);
      return [];
    }
  }

  return fs.readdirSync(basePath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(basePath, entry.name));
}

// 获取插件 manifest 内容
function getPluginManifest(pluginPath) {
  const manifestPath = path.join(pluginPath, "manifest.json");

  try {
    const data = fs.readFileSync(manifestPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    log(`插件缺失或无效的 manifest: ${pluginPath}`);
    return null;
  }
}

// 检查文件是否存在且是文件
function safeFile(path) {
  try {
    return fs.statSync(path).isFile() ? path : null;
  } catch {
    return null;
  }
}

// 获取所有插件信息（从代码目录和 profile 目录加载）
function getPlugins() {
  const plugins = {};
  const dirs = [BiliLoader.path.plugins, BiliLoader.path.builtinPlugins].filter(Boolean);
  const seen = new Set();
  const pluginPaths = dirs.flatMap(d => getPluginPaths(d));

  for (const pluginPath of pluginPaths) {
    const manifest = getPluginManifest(pluginPath);
    if (!manifest || !manifest.id) continue;
    if (seen.has(manifest.id)) continue; // profile 目录的插件优先级更高（先加载）
    seen.add(manifest.id);

    log("发现插件:", manifest.name);

    const injects = manifest.injects || {};
    const pluginId = manifest.id;

    const assetsDir = manifest.assets
      ? path.join(pluginPath, manifest.assets)
      : null;

    plugins[pluginId] = {
      manifest,
      path: {
        plugin: pluginPath,
        data: path.join(BiliLoader.path.data, pluginId),
        assets: assetsDir && fs.existsSync(assetsDir) ? assetsDir : null,
        injects: {
          main: safeFile(path.join(pluginPath, injects.main || "")),
          preload: safeFile(path.join(pluginPath, injects.preload || "")),
          renderer: safeFile(path.join(pluginPath, injects.renderer || "")),
          pageScripts: (injects.pageScripts || [])
            .map(p => safeFile(path.join(pluginPath, p)))
            .filter(Boolean),
        }
      }
    };
  }

  // 按依赖关系排序（拓扑排序）
  const sorted = {};
  const visited = new Set();

  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const deps = plugins[id]?.manifest?.dependencies || [];
    for (const dep of deps) {
      if (plugins[dep]) visit(dep);
      else log(`插件 ${id} 依赖 ${dep} 未找到`);
    }
    sorted[id] = plugins[id];
  }

  for (const id in plugins) visit(id);
  return sorted;
}

// 启动插件加载流程
function loadPluginsIfEnabled() {
  const globalConfig = BiliLoader.api.readConfig();

  if (!globalConfig?.enabled) {
    log("插件功能未启用");
    return;
  }

  log("开始加载插件...");
  const plugins = getPlugins();

  if (Object.keys(plugins).length === 0) {
    log("没有可用插件");
    return;
  }

  BiliLoader.plugins = plugins;
  log(`插件加载完成，共 ${Object.keys(plugins).length} 个插件`);
}

module.exports = { loadPluginsIfEnabled };
