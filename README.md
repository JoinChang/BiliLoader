# BiliLoader

BiliLoader 是一款为哔哩哔哩 PC 客户端实现的插件加载器。

纯个人兴趣项目，仅供学习交流使用。同时该项目处于早期开发阶段，部分接口随时可能会变更。

## 安装方法

1. 将 `BiliLoader` 放到任意目录（如 `C:\BiliLoader`）。
2. 打开终端，运行安装脚本：

    ```bash
    # 自动查找客户端
    npm run setup

    # 手动指定客户端安装目录
    npm run setup -- --app D:\bilibili
    ```

3. 重新启动哔哩哔哩客户端，BiliLoader 将自动加载。

> 客户端更新后需要重新运行安装脚本。

## 数据目录

BiliLoader 的用户数据目录：

- Windows: `%APPDATA%\BiliLoader`
- Linux / macOS: `~/.config/BiliLoader`

修改环境变量 `BILILOADER_PROFILE` 可以自定义数据目录。

```text
%APPDATA%\BiliLoader/
    ├─plugins/              // 用户插件目录
    ├─data/                 // 插件数据目录
    └─config.json           // BiliLoader 配置文件
```

> 内置插件位于代码目录的 `plugins/` 下，用户插件放在数据目录的 `plugins/` 下。同 ID 的用户插件会覆盖内置插件。

## 插件开发

插件目录结构：

```text
example-plugin/
    ├─src/
    │   ├─main.js           // 运行在 Electron 主进程下的插件入口
    │   ├─preload.js        // Electron 主进程与渲染进程交互的桥梁
    │   └─renderer.js       // 运行在 Electron 渲染进程下的页面脚本
    └─manifest.json         // 存放插件信息
```

## 特别鸣谢

[LiteLoaderQQNT](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT) - 该项目受到了 LiteLoaderQQNT 的启发，感谢他们的开源工作。
