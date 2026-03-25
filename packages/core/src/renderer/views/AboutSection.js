import { Button, ConfirmDialog, FlexRow, Margin, Text } from "../components/index.js";
import { checkUpdate } from "../utils/updater.js";

export function createAboutSection(view) {
  view.createSettingsItem({
    name: "关于 BiliLoader",
    className: "bl-about-item",
    children: [
      new Text({
        text: `BiliLoader 版本：${BiliLoader.versions.bili_loader}`,
        fontSize: 5,
      }),
      new Text({
        text: `Node 版本：${BiliLoader.versions.node}`,
        fontSize: 5,
        margin: { marginTop: Margin.XS },
      }),
      new Text({
        text: `Chromium 版本：${BiliLoader.versions.chrome}`,
        fontSize: 5,
        margin: { marginTop: Margin.XS },
      }),
      new Text({
        text: `Electron 版本：${BiliLoader.versions.electron}`,
        fontSize: 5,
        margin: { marginTop: Margin.XS },
      }),
      new FlexRow({
        children: [
          new Button({
            text: "打开配置目录",
            onClick: () => BiliLoader.api.openExternal(BiliLoader.path.profile),
          }),
          new Button({
            text: "检查更新",
            onClick: () => handleCheckUpdate(),
          }),
        ],
      }),
    ],
  });
}

async function handleCheckUpdate() {
  try {
    const result = await checkUpdate();
    if (result.hasUpdate) {
      await new ConfirmDialog({
        title: "发现新版本",
        content: `当前版本：${result.current}，最新版本：${result.latest}`,
        confirmText: "下载更新",
        cancelText: "暂不更新",
        onConfirm: () => handleDownloadUpdate(result),
      }).show();
    } else {
      await new ConfirmDialog({
        title: "检查更新",
        content: "当前已是最新版本。",
      }).show();
    }
  } catch (e) {
    await new ConfirmDialog({
      title: "检查更新失败",
      content: e.message,
    }).show();
  }
}

async function handleDownloadUpdate(result) {
  try {
    await BiliLoader.api.updateBiliLoader(result.zipUrl);
    await new ConfirmDialog({
      title: "下载完成",
      content: `${result.latest} 已准备就绪，重启客户端后自动应用。`,
      confirmText: "立即重启",
      cancelText: "稍后重启",
      onConfirm: () => BiliLoader.api.relaunch(),
    }).show();
  } catch (e) {
    await new ConfirmDialog({
      title: "更新失败",
      content: e.message,
    }).show();
  }
}
