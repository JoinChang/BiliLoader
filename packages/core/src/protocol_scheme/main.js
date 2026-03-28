const { app, protocol, net } = require("electron");
const path = require("path");

app.on("ready", () => {
  const schemes = ["local"];
  const old_schemes = app.commandLine.getSwitchValue("fetch-schemes");
  const new_schemes = [old_schemes, ...schemes].join(",");
  app.commandLine.appendSwitch("fetch-schemes", new_schemes);
});

protocol.registerSchemesAsPrivileged([
  {
    scheme: "local",
    privileges: {
      standard: false,
      allowServiceWorkers: true,
      corsEnabled: false,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
]);

/**
 * 校验解析后的路径是否在基目录内，防止路径穿越
 */
function safePath(baseDir, filePath) {
  const resolved = path.resolve(baseDir, filePath);
  if (!resolved.startsWith(path.resolve(baseDir) + path.sep) && resolved !== path.resolve(baseDir)) {
    return null;
  }
  return resolved;
}

exports.protocolRegister = (protocol) => {
  const intercepted = protocol.isProtocolIntercepted("local");

  if (!intercepted) {
    protocol.interceptFileProtocol("local", (req, callback) => {
      const { host, pathname } = new URL(decodeURI(req.url));
      const filepath = path.normalize(pathname.slice(1));

      let fullPath = null;
      switch (host) {
        case "root":
          fullPath = safePath(BiliLoader.path.root, filepath);
          break;
        case "profile":
          fullPath = safePath(BiliLoader.path.profile, filepath);
          break;
        case "plugin": {
          const parts = filepath.split(path.sep);
          const pluginId = parts[0];
          const assetPath = parts.slice(1).join(path.sep);
          const plugin = BiliLoader.plugins?.[pluginId];
          const assetsDir = plugin?.path?.assets;
          if (assetsDir) {
            fullPath = safePath(assetsDir, assetPath);
          }
          break;
        }
        default:
          if (host) {
            fullPath = safePath(path.join(app.getPath("userData"), host), filepath);
          } else {
            // 空 host = 绝对路径（插件 renderer 等），校验是否在允许的目录内
            const resolved = path.resolve(filepath);
            const allowed = [BiliLoader.path.root, BiliLoader.path.profile, BiliLoader.path.plugins, BiliLoader.path.builtinPlugins];
            if (allowed.some(dir => resolved.startsWith(path.resolve(dir) + path.sep))) {
              fullPath = resolved;
            }
          }
          break;
      }

      if (fullPath) {
        callback({ path: fullPath });
      } else {
        callback({ error: -6 }); // FILE_NOT_FOUND
      }
    });
  }
};
