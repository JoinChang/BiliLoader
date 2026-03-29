// 运行在 Electron 渲染进程下的页面脚本
import { dec } from './modules/bv2av/index.js';
import { showAdvancedFilterDialog } from './modules/feed-filter/dialog.js';
import { installContextMenu } from './modules/feed-filter/menu.js';

export const configDefaults = {
  "fall-asleep-time": 900000,
  "filter-ad": false,
  "filter-rocket-ad": false,
  "bv2av": false,
  "stealth-live": false,
  "hide-sidebar-pages": [],
  "hide-sidebar-buttons": [],
  "hide-home-tabs": [],
  "clean-share-url": false,
  "filter-title": [],
  "filter-title-regex": false,
  "filter-reason": [],
  "filter-reason-regex": false,
  "filter-uid": [],
  "filter-upname": [],
  "filter-upname-regex": false,
};

let config = null;
let assets = null;

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

const HOME_TABS = [
  { label: "直播", value: "直播" },
  { label: "热门", value: "热门" },
  { label: "追番", value: "追番" },
  { label: "影视", value: "影视" },
];

function applyHomeTabFilter() {
  const hidden = config.get("hide-home-tabs") || [];
  const nav = document.querySelector(".app_home .vui_tabs--nav");
  if (!nav) return;

  const items = nav.querySelectorAll(":scope > .vui_tabs--nav-item");
  for (const el of items) {
    const text = el.textContent?.trim();
    if (text === "推荐") continue;
    el.style.display = hidden.includes(text) ? "none" : "";
  }

  // 如果所有非推荐 tab 都被隐藏，隐藏整个 tab 栏
  const allHidden = HOME_TABS.every(item => hidden.includes(item.value));
  const tabsContainer = nav.closest(".vui_tabs");
  if (tabsContainer) {
    tabsContainer.style.display = allHidden ? "none" : "";
  }

  // 如果当前选中的 tab 被隐藏了，切换到推荐
  const activeTab = nav.querySelector(".vui_tabs--nav-item-active");
  const activeText = activeTab?.textContent?.trim();
  if (activeText && hidden.includes(activeText)) {
    const recommendTab = Array.from(items).find(el => el.textContent?.trim() === "推荐");
    recommendTab?.click();
  }
}

const TRACKING_PARAMS = ["vd_source", "spm_id_from", "from_spmid", "from"];

function cleanBiliUrl(text) {
  return text.replace(/(https?:\/\/www\.bilibili\.com\/video\/[^\s?]+)\?([^\s]*)/g, (match, base, query) => {
    const params = new URLSearchParams(query);
    TRACKING_PARAMS.forEach(p => params.delete(p));
    const cleaned = params.toString();
    return cleaned ? `${base}?${cleaned}` : base;
  });
}

let _shareCleanupHooked = false;
function hookShareCleanup() {
  if (_shareCleanupHooked) return;
  _shareCleanupHooked = true;
  const origExecCommand = document.execCommand.bind(document);
  document.execCommand = function (cmd, ...args) {
    if (cmd === "copy") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const text = sel.toString();
        const cleaned = cleanBiliUrl(text);
        if (cleaned !== text) {
          const tmp = document.createElement("span");
          tmp.style.cssText = "position:fixed;left:-9999px;";
          tmp.textContent = cleaned;
          document.body.appendChild(tmp);
          sel.selectAllChildren(tmp);
          const result = origExecCommand(cmd, ...args);
          tmp.remove();
          return result;
        }
      }
    }
    return origExecCommand(cmd, ...args);
  };
}

function onBvidFound(element) {
  const bv = element.innerText;
  const av = dec(bv);
  element.innerText = `av${av}`;
}

// 插件加载时触发
export const onReady = (ctx) => {
  config = ctx.config;
  assets = ctx.assets;
};

let _activeObservers = [];

function trackObserver(observer) {
  _activeObservers.push(observer);
  return observer;
}

function cleanupObservers() {
  _activeObservers.forEach(o => o.disconnect());
  _activeObservers = [];
}

// 页面加载时触发
export const onPageLoaded = async (url) => {
  if (url.includes("/index.html")) {
    applySidebarFilter();
  }

  if (url.includes("#/page/home/recommends")) {
    installContextMenu(config);
  }

  if (url.includes("#/page/home/")) {
    if (document.querySelector(".app_home .vui_tabs--nav")) {
      applyHomeTabFilter();
    } else {
      const observer = trackObserver(new MutationObserver(() => {
        if (document.querySelector(".app_home .vui_tabs--nav")) {
          observer.disconnect();
          applyHomeTabFilter();
        }
      }));
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (url.includes("/player.html")) {
    if (config.get("clean-share-url")) {
      hookShareCleanup();
    }

    if (config.get("bv2av")) {
      const observer = trackObserver(new MutationObserver(() => {
        const bvSpan = document.querySelector("span.item.bvid");
        if (bvSpan && bvSpan.innerText.startsWith("BV")) {
          onBvidFound(bvSpan);
        }
      }));
      observer.observe(document.body, { childList: true, subtree: true });

      const bvSpan = document.querySelector("span.item.bvid");
      if (bvSpan && bvSpan.innerText.startsWith("BV")) {
        onBvidFound(bvSpan);
      }
    }
  }
};

// 页面卸载时触发
export const onPageUnloaded = () => {
  cleanupObservers();
};

// 设置页面加载时触发
export const onSettingsPageLoaded = async (view) => {
  const rocketSvg = await assets.text("rocket.svg");
  const { Button, Checkbox, CheckboxGroup, Select, FlexRow, Margin, Tooltip } = window.BiliComponents;

  view.createSettingsItem({
    name: "通用",
    className: "bl-general-item",
    children: [
      new Select({
        label: "客户端自动休眠时间",
        defaultValue: config.get("fall-asleep-time"),
        options: [
          { label: "15 分钟（默认）", value: 900000 },
          { label: "30 分钟", value: 1800000 },
          { label: "1 小时", value: 3600000 },
          { label: "3 小时", value: 10800000 },
          { label: "永不", value: 0 },
        ],
        onChange: (value) => config.set("fall-asleep-time", value, { restart: true }),
        margin: { marginTop: Margin.MD },
      }),
    ],
  });

  view.createSettingsItem({
    name: "首页",
    className: "bl-home-item",
    children: [
      new CheckboxGroup({
        label: "隐藏首页标签",
        defaultValue: config.get("hide-home-tabs") || [],
        options: HOME_TABS,
        onChange: async (value) => {
          await config.set("hide-home-tabs", value);
          applyHomeTabFilter();
        },
      }),
      new Checkbox({
        label: "过滤广告",
        defaultValue: config.get("filter-ad"),
        onChange: async (value) => {
          await config.set("filter-ad", value);
        },
        margin: { marginTop: Margin.MD },
      }),
      new FlexRow({
        children: [
          new Checkbox({
            label: "过滤推广视频",
            defaultValue: config.get("filter-rocket-ad"),
            onChange: async (value) => {
              await config.set("filter-rocket-ad", value);
            },
          }),
          Vue.h("svg", {
            viewBox: "0 0 18 18",
            width: "18",
            height: "18",
            class: "text3",
            fill: "none",
            style: "flex-shrink: 0;",
            innerHTML: rocketSvg,
          }),
        ],
        margin: { marginTop: Margin.XS },
      }),
      new Button({
        text: "高级过滤",
        onClick: () => showAdvancedFilterDialog(config),
        margin: { marginTop: Margin.MD },
      }),
    ]
  });

  view.createSettingsItem({
    name: "侧边栏",
    className: "bl-sidebar-item",
    children: [
      new CheckboxGroup({
        label: "隐藏导航页面",
        defaultValue: config.get("hide-sidebar-pages") || [],
        options: getSidebarPages(),
        onChange: async (value) => {
          await config.set("hide-sidebar-pages", value);
          applySidebarFilter();
        },
      }),
      new CheckboxGroup({
        label: "隐藏快捷按钮",
        defaultValue: config.get("hide-sidebar-buttons") || [],
        options: getSidebarButtons(),
        onChange: async (value) => {
          await config.set("hide-sidebar-buttons", value);
          applySidebarFilter();
        },
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
          await config.set("bv2av", value);
        },
        margin: { marginTop: Margin.MD },
      }),
      new Checkbox({
        label: "去除分享链接跟踪参数",
        defaultValue: config.get("clean-share-url"),
        onChange: async (value) => {
          await config.set("clean-share-url", value);
        },
        margin: { marginTop: Margin.XS },
      }),
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
            onChange: (value) => config.set("stealth-live", value),
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
