// 运行在 Electron 渲染进程下的页面脚本
import { dec } from './modules/bv2av/index.js';

const config = new window.BiliConfigManager("bililoader-extension", {
  "filter-ad": false,
  "filter-rocket-ad": false,
  "bv2av": false,
  "stealth-live": false,
});

async function setConfig(key, value, options = {}) {
  const success = await config.set(key, value, options);
  if (!success) {
    new window.BiliComponents.ConfirmDialog({
      title: "错误",
      content: "设置失败，请检查是否有权限修改设置",
    }).show();
  }
}


function onBvidFound(element) {
  const bv = element.innerText;
  const av = dec(bv);
  element.innerText = `av${av}`;
}

// 插件加载时触发
export const onReady = async () => {
  await config.load();
};

// 页面加载时触发
export const onPageLoaded = async (url) => {
  await config.load();

  if (url.includes("#/page/home/recommends")) {
    const observer = new MutationObserver(() => {
      const items = document.querySelectorAll(".app_home--video-item");
      items.forEach(item => {
        if (config.get("filter-ad") && item.querySelector(".picture-ad-card")) {
          item.remove();
        }
        if (config.get("filter-rocket-ad") && item.querySelector(".bili-video-card__stats--adicon")) {
          item.remove();
        }
      });
    });

    observer.observe(document.querySelector(".scroll-content>.app_home--video"), {
      childList: true,
      subtree: true,
    });
  }

  if (url.includes("/player.html")) {
    if (config.get("bv2av")) {
      const observer = new MutationObserver(() => {
        const bvSpan = document.querySelector("span.item.bvid");
        if (bvSpan && bvSpan.innerText.startsWith("BV")) {
          onBvidFound(bvSpan);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // 元素可能已存在，立即检查一次
      const bvSpan = document.querySelector("span.item.bvid");
      if (bvSpan && bvSpan.innerText.startsWith("BV")) {
        onBvidFound(bvSpan);
      }
    }
  }
};

// 设置页面加载时触发
export const onSettingsPageLoaded = (view) => {
  const { Checkbox, Margin } = window.BiliComponents;

  view.createSettingsItem({
    name: "首页",
    className: "bl-home-item",
    children: [
      new Checkbox({
        label: "过滤广告",
        defaultValue: config.get("filter-ad"),
        onChange: async (value) => {
          await setConfig("filter-ad", value);
        },
        margin: { marginTop: Margin.MD },
      }),
      new Checkbox({
        label: "过滤推广视频（小火箭）",
        defaultValue: config.get("filter-rocket-ad"),
        onChange: async (value) => {
          await setConfig("filter-rocket-ad", value);
        },
        margin: { marginTop: Margin.XS },
      }),
    ]
  });

  view.createSettingsItem({
    name: "视频",
    className: "bl-video-item",
    children: [
      new Checkbox({
        label: "显示 AV 号",
        defaultValue: config.get("bv2av"),
        onChange: async (value) => {
          await setConfig("bv2av", value);
        },
        margin: { marginTop: Margin.MD },
      })
    ]
  });

  view.createSettingsItem({
    name: "直播",
    className: "bl-live-item",
    children: [
      new Checkbox({
        label: "隐身进入直播间",
        defaultValue: config.get("stealth-live"),
        onChange: (value) => setConfig("stealth-live", value),
        margin: { marginTop: Margin.MD },
      }),
    ]
  });
};
