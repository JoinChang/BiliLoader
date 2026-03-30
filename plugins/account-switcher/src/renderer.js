// 运行在 Electron 渲染进程下的页面脚本

const api = window.__account_switcher__;

let assets = null;
let icons = {};

export const onReady = async (ctx) => {
  assets = ctx.assets;
  icons = {
    check: await assets.text("check.svg"),
    logout: await assets.text("logout.svg"),
    plus: await assets.text("plus.svg"),
  };
};

function showAccountDialog() {
  const { Notification, ConfirmDialog } = window.BiliComponents;
  const { h, render } = Vue;

  const wrapper = document.createElement("div");
  const VDialog = app.__vue_app__.component("VDialog");

  let accounts = [];
  let currentMid = null;
  let visible = true;

  function hide() {
    render(null, wrapper);
  }

  async function refresh() {
    accounts = await api.getAccounts();
    currentMid = await api.getCurrentMid();
  }

  function renderDialog() {
    const listItems = accounts.map(account => {
      const isCurrent = account.mid === currentMid;

      return h("div", {
        class: "bl-account-item",
        style: "display: flex; align-items: center; cursor: pointer;",
        onClick: () => {
          if (isCurrent) return;
          new ConfirmDialog({
            title: "切换账号",
            content: `切换到「${account.uname}」需要重启客户端，是否继续？`,
            confirmText: "切换并重启",
            onConfirm: () => {
              api.switchAccount(account.mid).then(result => {
                if (result.success) {
                  BiliLoader.api.relaunch();
                } else {
                  new Notification({ title: "切换失败", content: result.error || "未知错误" }).show();
                }
              });
            },
          }).show();
        },
      }, [
        h("img", {
          src: account.face,
          style: "width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;",
        }),
        h("div", {
          class: "b_text text1",
          style: "flex: 1; min-width: 0; margin-left: 12px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
        }, account.uname),
        isCurrent
          ? h("div", {
              style: "width: 24px; height: 24px; border-radius: 50%; background: #FB7299; display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
            }, [h("span", { innerHTML: icons.check })])
          : h("div", {
              class: "bl-account-remove",
              style: "width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--text3); cursor: pointer;",
              onClick: (e) => {
                e.stopPropagation();
                new ConfirmDialog({
                  title: "移除账号",
                  content: `确定要从列表中移除「${account.uname}」吗？`,
                  confirmText: "移除",
                  danger: true,
                  onConfirm: async () => {
                    hide();
                    await api.removeAccount(account.mid);
                    showAccountDialog();
                  },
                }).show();
              },
            }, [h("span", { innerHTML: icons.logout })]),
      ]);
    });

    const addRow = h("div", {
      class: "bl-account-item",
      style: "display: flex; align-items: center; cursor: pointer;",
      onClick: () => {
        new ConfirmDialog({
          title: "添加账号",
          content: "添加新账号后需要重启客户端，是否继续？",
          confirmText: "继续",
          onConfirm: async () => { await api.addAccount(); },
        }).show();
      },
    }, [
      h("div", {
        style: "width: 36px; height: 36px; border-radius: 50%; background: var(--graph_bg_thin); display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
      }, [h("span", { innerHTML: icons.plus })]),
      h("div", {
        class: "b_text text1",
        style: "margin-left: 12px; font-size: 14px;",
      }, "添加账号"),
    ]);

    const dialogVNode = h(VDialog, {
      visible,
      center: true,
      isShowDefaultFooter: false,
      width: 360,
      title: "切换账号",
      className: "i_dialog pl_lg pr_lg",
      "onUpdate:visible": (val) => { if (!val) hide(); },
    }, {
      default: () => h("div", { style: "text-align: left;" }, [
        ...listItems,
        accounts.length > 0 ? h("div", { style: "border-bottom: 1px solid var(--line_regular); margin: 6px 0;" }) : null,
        addRow,
      ]),
    });

    render(dialogVNode, wrapper);
  }

  refresh().then(() => renderDialog());
}

async function injectAccountSwitcher() {
  const loginItem = document.querySelector(".settings_content--item.login-item");
  if (!loginItem) return;
  if (loginItem.querySelector(".bl-account-switcher")) return;

  // 游客状态不显示
  const currentMid = await api.getCurrentMid();
  if (!currentMid) return;

  const container = document.createElement("div");
  container.className = "bl-account-switcher";
  container.style.cssText = "margin-top: 12px;";
  loginItem.appendChild(container);

  const { h, render } = Vue;
  render(h(app.__vue_app__.component("VButton"), {
    text: "切换账号",
    onClick: () => showAccountDialog(),
  }), container);

  api.saveCurrentAccount();
}

function injectStyles() {
  if (document.querySelector("#bl-account-switcher-styles")) return;
  const style = document.createElement("style");
  style.id = "bl-account-switcher-styles";
  style.textContent = `
    .bl-account-item { border-radius: 6px; transition: background .15s; margin: 0 -12px; padding: 10px 12px; }
    .bl-account-item:hover { background: rgba(128, 128, 128, 0.08); }
    .bl-account-item .bl-account-remove { opacity: 0; transition: opacity .15s, background .15s; }
    .bl-account-item:hover .bl-account-remove { opacity: 1; }
  `;
  document.head.appendChild(style);
}

export const onPageLoaded = async (url) => {
  if (url.includes("#/page/settings")) {
    injectStyles();
    const tryInject = () => {
      if (document.querySelector(".settings_content--item.login-item")) {
        injectAccountSwitcher();
      } else {
        requestAnimationFrame(tryInject);
      }
    };
    tryInject();
  }
};
