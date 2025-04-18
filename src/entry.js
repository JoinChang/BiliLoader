const { log } = require("./logger.js");

// 初始化 BiliLoader 对象
log("初始化中...");
require("./core/main.js");

// 加载插件配置
require("./plugin_loader/manifest.js");

// 注入文件
require("./main.js");

// 打开主程序
log("正在启动客户端...");
require(require("path").join(process.resourcesPath, "app/index.js"));
