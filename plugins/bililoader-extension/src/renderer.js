// 运行在 Electron 渲染进程下的页面脚本
import { dec } from './modules/bv2av/index.js';

const ROCKET_ICON = '<g clip-path="url(#a)" fill="currentColor"><path d="M5.688 11.117c.039.298.1.61.157.904l2.524 1.458c.294-.092.583-.201.862-.317.356-.148.69-.308 1.015-.505a.522.522 0 0 1 .157-.063.52.52 0 0 1 .644.402c.084.403.097.825.051 1.244a4.287 4.287 0 0 1-.095.452c.295-.014.594-.087.856-.228a2.535 2.535 0 0 0 1.12-.998l.013-.022a2.5 2.5 0 0 0 .339-1.372 2.305 2.305 0 0 0-.458-1.324.53.53 0 0 1-.012-.607l.226-.391a8.077 8.077 0 0 0 1.097-3.992 8.043 8.043 0 0 0-.884-3.722 7.892 7.892 0 0 0-3.654 1.102 8.152 8.152 0 0 0-2.908 2.945l-.107.185-.095.19c-.102.203-.305.347-.538.305a2.497 2.497 0 0 0-2.383 1.252 2.471 2.471 0 0 0-.324 1.502c-.013.285.073.58.208.843.107-.107.226-.208.344-.309a3.808 3.808 0 0 1 1.092-.583.581.581 0 0 1 .177-.02c.295-.015.525.24.523.532-.008.38.014.76.053 1.136Z" fill-opacity=".1"></path><path d="M5.688 11.116c.038.3.1.611.156.905l2.524 1.457c.295-.09.584-.2.862-.316a7.393 7.393 0 0 0 1.016-.505.524.524 0 0 1 .157-.063.52.52 0 0 1 .643.402c.085.403.098.825.052 1.244a4.286 4.286 0 0 1-.095.452c.295-.014.594-.087.856-.228a2.535 2.535 0 0 0 1.12-.998l.013-.023c.252-.438.36-.913.338-1.371a2.305 2.305 0 0 0-.457-1.324.53.53 0 0 1-.012-.607l.226-.392a8.077 8.077 0 0 0 1.097-3.991 8.043 8.043 0 0 0-.884-3.722 7.892 7.892 0 0 0-3.655 1.102 8.152 8.152 0 0 0-2.908 2.945l-.106.185-.095.19c-.102.203-.306.347-.538.305a2.497 2.497 0 0 0-2.383 1.252 2.471 2.471 0 0 0-.324 1.502c-.014.285.072.58.208.843.107-.108.225-.208.344-.309a3.808 3.808 0 0 1 1.091-.583.58.58 0 0 1 .178-.02c.295-.015.525.24.523.532-.008.38.013.76.053 1.136Zm1.484 3.52c.312.18.363.598.203.825l-.916 1.586c-.139.24-.568.413-.858.246-.289-.167-.37-.636-.21-.863l.916-1.585c.138-.24.576-.375.865-.209Zm-1.946-1.079c.3.173.351.547.202.805l-1.526 2.55c-.172.22-.61.321-.884.15s-.294-.558-.166-.806l1.538-2.518c.138-.24.557-.341.836-.18ZM13.665.904c.2-.007.373.109.462.267a8.957 8.957 0 0 1 1.163 4.5 9.03 9.03 0 0 1-1.235 4.51l-.08.138c.279.482.43 1.03.45 1.592a3.615 3.615 0 0 1-.483 1.958l-.02.034a3.599 3.599 0 0 1-1.597 1.437 3.532 3.532 0 0 1-2.161.253.524.524 0 0 1-.368-.3.544.544 0 0 1 .022-.482c.134-.26.235-.538.266-.826l.002-.107a3.604 3.604 0 0 1-.405.18c-.398.168-.806.3-1.218.415a.51.51 0 0 1-.395-.044l-2.9-1.675a.504.504 0 0 1-.246-.356 9.089 9.089 0 0 1-.235-1.208c-.02-.149-.027-.291-.046-.44l-.099.066a2.596 2.596 0 0 0-.582.644.538.538 0 0 1-.733.174c-.05-.044-.094-.07-.115-.113a3.44 3.44 0 0 1-.846-1.974c-.08-.72.075-1.458.466-2.135a3.496 3.496 0 0 1 1.442-1.404 3.863 3.863 0 0 1 1.615-.4l.08-.138a9.138 9.138 0 0 1 3.3-3.318A8.93 8.93 0 0 1 13.664.904Z"></path><path d="M11.365 5.912c.225.13.285.43.155.654l-.057.1-.908.676.694.328c.15.086.256.247.244.44-.011.193-.097.342-.269.409L8.903 9.6a.57.57 0 0 1-.436-.052.432.432 0 0 1-.126-.703l.957-.879-.631-.261a.475.475 0 0 1-.245-.44.482.482 0 0 1 .283-.434l2.25-.958a.687.687 0 0 1 .36.01l.05.028Z"></path></g>';

const config = new window.BiliConfigManager("bililoader-extension", {
  "filter-ad": false,
  "filter-rocket-ad": false,
  "bv2av": false,
  "stealth-live": false,
  "hide-sidebar-pages": [],
  "hide-sidebar-buttons": [],
  "hide-home-tabs": [],
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

  if (url.includes("#/page/home/")) {
    if (document.querySelector(".app_home .vui_tabs--nav")) {
      applyHomeTabFilter();
    } else {
      const observer = new MutationObserver(() => {
        if (document.querySelector(".app_home .vui_tabs--nav")) {
          observer.disconnect();
          applyHomeTabFilter();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
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
    name: "首页",
    className: "bl-home-item",
    children: [
      new CheckboxGroup({
        label: "隐藏首页标签",
        defaultValue: config.get("hide-home-tabs") || [],
        options: HOME_TABS,
        onChange: async (value) => {
          await setConfig("hide-home-tabs", value);
          applyHomeTabFilter();
        },
      }),
      new Checkbox({
        label: "过滤广告",
        defaultValue: config.get("filter-ad"),
        onChange: async (value) => {
          await setConfig("filter-ad", value);
        },
        margin: { marginTop: Margin.MD },
      }),
      new FlexRow({
        children: [
          new Checkbox({
            label: "过滤推广视频",
            defaultValue: config.get("filter-rocket-ad"),
            onChange: async (value) => {
              await setConfig("filter-rocket-ad", value);
            },
          }),
          Vue.h("svg", {
            viewBox: "0 0 18 18",
            width: "18",
            height: "18",
            class: "text3",
            fill: "none",
            style: "flex-shrink: 0;",
            innerHTML: ROCKET_ICON,
          }),
        ],
        margin: { marginTop: Margin.XS },
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
