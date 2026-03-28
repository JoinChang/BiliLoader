/**
 * MCP Tools — 定义与分发
 */

const page = require("./handlers/page.js");
const network = require("./handlers/network.js");
const live = require("./handlers/live.js");
const mainProcess = require("./handlers/main-process.js");

const TOOLS = [
  // 页面连接
  { name: "list_pages", description: "列出哔哩哔哩客户端所有可调试的页面", inputSchema: { type: "object", properties: {} } },
  { name: "connect_page", description: "连接到指定页面进行调试。支持传入 targetId 精确连接,或用 target 关键字模糊匹配(main=主界面, player=播放器, live=直播间)。不传参数则自动连接主界面", inputSchema: { type: "object", properties: {
    targetId: { type: "string", description: "目标页面 ID,从 list_pages 获取" },
    target: { type: "string", description: "快捷关键字: main(主界面), player(播放器), live(直播间),或 URL 中的关键字" },
  }}},

  // DOM 与 JS（渲染进程）
  { name: "query_dom", description: "使用 CSS 选择器查询 DOM 元素。返回匹配元素的标签名、属性、文本等信息。支持 iframe 内查询和获取 HTML", inputSchema: { type: "object", properties: {
    selector: { type: "string", description: "CSS 选择器" },
    limit: { type: "number", description: "最多返回的元素数量,默认 10" },
    iframe: { type: "boolean", description: "是否在 iframe 内查询,默认 false" },
    html: { type: "boolean", description: "是否返回匹配元素的 outerHTML(仅返回第一个匹配),默认 false" },
    inner: { type: "boolean", description: "配合 html=true 使用,返回 innerHTML 而非 outerHTML" },
  }, required: ["selector"] }},
  { name: "execute_js", description: "在页面中执行 JavaScript 表达式并返回结果。支持在 iframe 上下文中执行", inputSchema: { type: "object", properties: {
    expression: { type: "string", description: "要执行的 JavaScript 表达式" },
    awaitPromise: { type: "boolean", description: "是否等待 Promise 结果,默认 true" },
    iframe: { type: "boolean", description: "是否在 iframe 内执行,默认 false" },
  }, required: ["expression"] }},

  // 主进程 JS
  { name: "execute_main_js", description: "在 Electron 主进程中执行 JavaScript 并返回结果。可用全局对象: biliApp(客户端服务: reportService/fetchService/windowFactory/storeService等), mainWindow(主窗口BrowserWindow), __require(Node.js require函数), process, globalThis。示例: biliApp.windowFactory.liveRoomWindowState, __require('electron').BrowserWindow", inputSchema: { type: "object", properties: {
    expression: { type: "string", description: "要在主进程执行的 JavaScript 表达式,最后一个表达式的值作为返回值" },
  }, required: ["expression"] }},

  // 网络
  { name: "get_network_log", description: "获取已记录的网络请求列表(含 postData)", inputSchema: { type: "object", properties: {
    filter: { type: "string", description: "按 URL 关键字过滤" },
    type: { type: "string", description: "按资源类型过滤 (XHR, Fetch, Script, Stylesheet 等)" },
    limit: { type: "number", description: "最多返回数量,默认 50" },
  }}},
  { name: "get_request_detail", description: "获取指定网络请求的响应体内容", inputSchema: { type: "object", properties: {
    requestId: { type: "string", description: "请求 ID,从 get_network_log 获取" },
  }, required: ["requestId"] }},
  { name: "intercept_requests", description: "使用 CDP Fetch domain 拦截网络请求。可以阻止、修改 URL。用于调试分析。调用 action=disable 停止拦截并返回记录", inputSchema: { type: "object", properties: {
    action: { type: "string", description: "enable=开始拦截, disable=停止拦截" },
    patterns: { type: "array", items: { type: "string" }, description: "URL 匹配模式列表,如 ['*getInfoByUser*']" },
    blockPatterns: { type: "array", items: { type: "string" }, description: "要阻止的 URL 关键字" },
    modifyRules: { type: "array", items: { type: "object" }, description: "URL 修改规则: [{match, replace, with}]" },
  }, required: ["action"] }},

  // 导航与页面
  { name: "navigate", description: "在主界面中导航页面(Vue Router),或通过 bvid 在播放器中打开视频。会自动连接到主界面", inputSchema: { type: "object", properties: {
    path: { type: "string", description: "路径,如 /page/home/recommends、/page/home/live、/page/settings" },
    bvid: { type: "string", description: "视频 BV 号,优先于 path" },
  }}},
  { name: "screenshot", description: "截取当前页面截图", inputSchema: { type: "object", properties: {
    fullPage: { type: "boolean", description: "是否截取整个页面(包括滚动区域),默认 false" },
  }}},
  { name: "reload_page", description: "重载当前连接的页面", inputSchema: { type: "object", properties: {} } },
  { name: "inject_css", description: "向当前页面注入临时 CSS 样式,用于实时调试。再次调用会覆盖之前注入的样式", inputSchema: { type: "object", properties: {
    css: { type: "string", description: "要注入的 CSS 内容" },
    remove: { type: "boolean", description: "传 true 移除之前注入的 CSS" },
  }}},
  { name: "reload_iframe", description: "刷新当前页面中的 iframe(直播间等页面内容在 iframe 中)", inputSchema: { type: "object", properties: {} } },

  // 直播弹幕
  { name: "connect_live_danmaku", description: "连接直播间弹幕 WS 服务器,开始实时接收弹幕。需要先 connect_page 到直播间页面", inputSchema: { type: "object", properties: {
    roomId: { type: "number", description: "直播间 ID,不传则自动获取" },
  }}},
  { name: "get_live_danmaku", description: "获取实时弹幕缓冲区内容。支持按类型过滤: danmaku, gift, superchat, enter, guard", inputSchema: { type: "object", properties: {
    limit: { type: "number", description: "数量,默认 20" },
    type: { type: "string", description: "消息类型过滤" },
    clear: { type: "boolean", description: "获取后清空缓冲区" },
  }}},
];

async function executeTool(ctx, name, args = {}) {
  const { cdp, danmaku } = ctx;
  switch (name) {
    case "list_pages":          return await page.handleListPages(cdp);
    case "connect_page":        return await page.handleConnectPage(cdp, args);
    case "query_dom":           return await page.handleQueryDom(cdp, args);
    case "execute_js":          return await page.handleExecuteJs(cdp, args);
    case "navigate":            return await page.handleNavigate(cdp, args);
    case "screenshot":          return await page.handleScreenshot(cdp, args);
    case "reload_page":          return await page.handleReloadPage(cdp);
    case "inject_css":           return await page.handleInjectCss(cdp, args);
    case "reload_iframe":        return await page.handleReloadIframe(cdp);
    case "execute_main_js":     return await mainProcess.handleExecuteMainJs(args);
    case "get_network_log":     return await network.handleGetNetworkLog(cdp, args);
    case "get_request_detail":  return await network.handleGetRequestDetail(cdp, args);
    case "intercept_requests":  return await network.handleInterceptRequests(cdp, args);
    case "connect_live_danmaku": return await live.handleConnectLiveDanmaku(cdp, danmaku, args);
    case "get_live_danmaku":    return await live.handleGetLiveDanmaku(danmaku, args);
    default: throw new Error(`未知的工具: ${name}`);
  }
}

module.exports = { TOOLS, executeTool };
