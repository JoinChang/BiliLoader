// 页面连接、导航、DOM 查询、JS 执行、截图
const { text, image, evaluate, findTarget } = require("./utils.js");

async function handleListPages(cdp) {
  const targets = await cdp.listTargets();
  const pages = targets
    .filter(t => t.type === "page")
    .map(t => ({ id: t.id, title: t.title, url: t.url }));
  return text(JSON.stringify(pages, null, 2));
}

async function handleConnectPage(cdp, { targetId, target }) {
  if (targetId) {
    const t = await cdp.connect(targetId);
    return text(`已连接到页面: ${t.title} (${t.url})`);
  }
  const targets = await cdp.listTargets();
  const keyword = target || "main";
  const matched = findTarget(targets, keyword);
  if (!matched) {
    const available = targets.filter(t => t.type === "page").map(t => `  - ${t.title} (${t.url})`).join("\n");
    throw new Error(`未找到匹配 "${keyword}" 的页面。可用页面:\n${available}`);
  }
  const t = await cdp.connect(matched.id);
  return text(`已连接到页面: ${t.title} (${t.url})`);
}

async function handleQueryDom(cdp, { selector, limit = 10, iframe = false, html = false, inner = false }) {
  if (html) {
    const prop = inner ? "innerHTML" : "outerHTML";
    const expr = `(${iframe ? "_doc" : "document"}).querySelector(${JSON.stringify(selector)})?.${prop} || "未找到元素"`;
    return text(await evaluate(cdp, expr, { iframe }));
  }
  const value = await evaluate(cdp, `(() => {
    const doc = ${iframe ? "_doc" : "document"};
    const nodes = doc.querySelectorAll(${JSON.stringify(selector)});
    return Array.from(nodes).slice(0, ${limit}).map((el, i) => ({
      index: i,
      tagName: el.tagName.toLowerCase(),
      id: el.id || undefined,
      className: el.className || undefined,
      textContent: el.textContent?.substring(0, 200) || undefined,
      attributes: Object.fromEntries(Array.from(el.attributes).map(a => [a.name, a.value])),
      childElementCount: el.childElementCount,
    }));
  })()`, { iframe });
  return text(JSON.stringify(value, null, 2));
}

async function handleExecuteJs(cdp, { expression, awaitPromise = true, iframe = false }) {
  const value = await evaluate(cdp, expression, { iframe, awaitPromise });
  if (typeof value === "object") return text(JSON.stringify(value, null, 2));
  return text(String(value ?? "undefined"));
}

async function handleNavigate(cdp, { path, bvid }) {
  if (!path && !bvid) throw new Error("请传入 path 或 bvid 参数");

  const targets = await cdp.listTargets();
  const mainPage = findTarget(targets, "main");
  if (mainPage && cdp.lastTargetId !== mainPage.id) await cdp.connect(mainPage.id);

  if (bvid) {
    if (!/^BV[\w]+$/.test(bvid)) throw new Error("无效的 BV 号格式");
    await evaluate(cdp, `(() => {
      const a = document.createElement('a');
      a.href = 'https://www.bilibili.com/video/' + ${JSON.stringify(bvid)};
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    })()`);
    await new Promise(r => setTimeout(r, 2000));
    const newTargets = await cdp.listTargets();
    const player = newTargets.find(t => t.url.includes("player.html") && t.url.includes(bvid));
    if (player) {
      await cdp.connect(player.id);
      return text(`已在播放器中打开视频 ${bvid}`);
    }
    return text(`已打开视频 ${bvid}（可用 connect_page target=player 切换）`);
  }

  const value = await evaluate(cdp, `(async () => {
    const router = document.querySelector('#app').__vue_app__.config.globalProperties.$router;
    await router.push(${JSON.stringify(path)});
    await new Promise(r => setTimeout(r, 1000));
    return { url: location.href, title: document.title };
  })()`, { awaitPromise: true });
  return text(`已导航到: ${value.title} (${value.url})`);
}

async function handleScreenshot(cdp, { fullPage = false }) {
  if (fullPage) {
    const layoutMetrics = await cdp.send("Page.getLayoutMetrics");
    const { width, height } = layoutMetrics.contentSize;
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: Math.ceil(width), height: Math.ceil(height), deviceScaleFactor: 1, mobile: false });
    const result = await cdp.send("Page.captureScreenshot", { format: "png" });
    await cdp.send("Emulation.clearDeviceMetricsOverride");
    return image(result.data);
  }
  const result = await cdp.send("Page.captureScreenshot", { format: "png" });
  return image(result.data);
}

async function handleReloadPage(cdp) {
  await cdp.send("Page.enable");
  const loaded = new Promise(resolve => {
    const handler = cdp._handleEvent.bind(cdp);
    const orig = cdp._handleEvent;
    cdp._handleEvent = function (method, params) {
      orig.call(this, method, params);
      if (method === "Page.loadEventFired") {
        cdp._handleEvent = orig;
        resolve();
      }
    };
    // 超时兜底
    setTimeout(() => { cdp._handleEvent = orig; resolve(); }, 10000);
  });
  await cdp.send("Page.reload");
  await loaded;
  return text("页面已重载");
}

async function handleInjectCss(cdp, { css, remove = false }) {
  if (remove) {
    await evaluate(cdp, `(() => {
      const el = document.getElementById('__mcp-injected-css');
      if (el) el.remove();
      return 'removed';
    })()`);
    return text("已移除注入的 CSS");
  }
  if (!css) throw new Error("请传入 css 参数");
  await evaluate(cdp, `(() => {
    let el = document.getElementById('__mcp-injected-css');
    if (!el) {
      el = document.createElement('style');
      el.id = '__mcp-injected-css';
      document.head.appendChild(el);
    }
    el.textContent = ${JSON.stringify(css)};
  })()`);
  return text("CSS 已注入");
}

async function handleReloadIframe(cdp) {
  const value = await evaluate(cdp, `(() => {
    const iframe = document.querySelector('iframe');
    if (!iframe) return 'no iframe found';
    iframe.contentWindow.location.reload();
    return 'iframe reloaded: ' + iframe.src.split('?')[0];
  })()`);
  return text(value);
}

module.exports = {
  handleListPages, handleConnectPage, handleQueryDom,
  handleExecuteJs, handleNavigate, handleScreenshot,
  handleReloadPage, handleInjectCss, handleReloadIframe,
};
