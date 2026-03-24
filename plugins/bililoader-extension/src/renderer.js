// 运行在 Electron 渲染进程下的页面脚本
import { dec } from './modules/bv2av/index.js';

const config = new window.BiliConfigManager("bililoader-extension", {
  "filter-ad": false,
  "filter-rocket-ad": false,
  "bv2av": false,
  "stealth-live": false,
  "hide-sidebar-pages": [],
  "hide-sidebar-buttons": [],
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


// 不可隐藏的侧边栏项
const SIDEBAR_PAGE_EXCLUDE = ["首页"];
const SIDEBAR_BUTTON_EXCLUDE = ["消息", "主题", "设置"];

function getSidebarPages() {
  const wrap = document.querySelector(".app_sidebar--pages-wrap");
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll(":scope > li.pages-item")).map(el => {
    const a = el.querySelector("a");
    const label = el.textContent?.trim();
    const href = a?.getAttribute("href");
    return { label, value: href, el };
  }).filter(item => item.label && !SIDEBAR_PAGE_EXCLUDE.includes(item.label));
}

function getSidebarButtons() {
  const wrap = document.querySelector(".app_sidebar--settings");
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll(":scope > li.settings-item")).map(el => {
    const title = el.getAttribute("title") || el.querySelector("[title]")?.getAttribute("title");
    return { label: title, value: title, el };
  }).filter(item => item.label && !SIDEBAR_BUTTON_EXCLUDE.includes(item.label));
}

function applySidebarFilter() {
  const hiddenPages = config.get("hide-sidebar-pages") || [];
  for (const item of getSidebarPages()) {
    item.el.style.display = hiddenPages.includes(item.value) ? "none" : "";
  }

  const hiddenButtons = config.get("hide-sidebar-buttons") || [];
  for (const item of getSidebarButtons()) {
    item.el.style.display = hiddenButtons.includes(item.value) ? "none" : "";
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

  if (url.includes("/index.html")) {
    applySidebarFilter();
  }

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
  const { Checkbox, CheckboxGroup, FlexRow, Margin, Tooltip } = window.BiliComponents;

  view.createSettingsItem({
    name: "侧边栏",
    className: "bl-sidebar-item",
    children: [
      new CheckboxGroup({
        label: "隐藏导航页面",
        defaultValue: config.get("hide-sidebar-pages") || [],
        options: getSidebarPages(),
        onChange: async (value) => {
          await setConfig("hide-sidebar-pages", value);
          applySidebarFilter();
        },
      }),
      new CheckboxGroup({
        label: "隐藏快捷按钮",
        defaultValue: config.get("hide-sidebar-buttons") || [],
        options: getSidebarButtons(),
        onChange: async (value) => {
          await setConfig("hide-sidebar-buttons", value);
          applySidebarFilter();
        },
      }),
    ]
  });

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
      new FlexRow({
        children: [
          new Checkbox({
            label: "隐身进入直播间",
            defaultValue: config.get("stealth-live"),
            onChange: (value) => setConfig("stealth-live", value),
          }),
          new Tooltip({
            text: "启用后进入直播间将不再上报入场事件，且不会在房间观众中显示。",
            placement: "right",
          }),
        ],
        margin: { marginTop: Margin.MD },
      }),
    ]
  });
};
