# BiliLoader

BiliLoader 是一款为哔哩哔哩 PC 客户端实现的插件加载器。

纯个人兴趣项目，仅供学习交流使用。同时该项目处于早期开发阶段，部分接口随时可能会变更。

## 安装方法

1. 导航到哔哩哔哩客户端安装目录，进入 `resources` 文件夹。
2. 打开控制台，运行以下指令：
    ```
    npm install -g asar
    asar extract app.asar app
    rename app.asar app.asar.bak
    ```
3. 将 `BiliLoader` 文件夹复制到 `app` 文件夹内。
4. 编辑 `app` 文件夹内的 `package.json` 文件，添加以下内容：
    ```json5
    {
      "name": "bilibili",
      // ...
      "homepage": "https://www.bilibili.com",
      "main": "BiliLoader" // 添加这一行
    }
    ```
5. 重新启动哔哩哔哩客户端，BiliLoader 将自动加载。

## 数据目录

BiliLoader 的默认数据文件夹：

- Windows: `C:\\BiliLoader`
- Linux: `~/Documents/BiliLoader`
- macOS: `~/Documents/BiliLoader`

修改环境变量 `BILILOADER_PROFILE` 可以更改数据目录。

数据目录结构：
```
BiliLoader
    ├─plugins           // 插件本体目录
    │   ├─my-plugin     // 插件本体
    │   └─...
    ├─data              // 插件数据目录
    │   └─...
    └─config.json       // BiliLoader 配置文件
```

插件目录结构：
```
example-plugin
    ├─src
    │   ├─main.js       // 运行在 Electron 主进程下的插件入口
    │   ├─preload.js    // Electron 主进程与渲染进程交互的桥梁
    │   └─renderer.js   // 运行在 Electron 渲染进程下的页面脚本
    └─manifest.json     // 存放插件信息
```

## 特别鸣谢

[LiteLoaderQQNT](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT) - 该项目受到了 LiteLoaderQQNT 的启发，感谢他们的开源工作。
