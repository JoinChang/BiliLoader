/**
 * 提取页面 Vue Runtime 并挂载到 window.Vue
 *
 * 旧版（<= 1.16.x）: runtime-dom.esm-bundler.js 独立存在，直接 import
 * 新版（>= 1.17.x）: Vue 内联打包，导出名被压缩
 *   → CDN Vue 提供 mergeProps 等工具函数
 *   → 页面 Vue chunk 的 createApp/h/ref/reactive/Fragment 覆盖核心函数
 *   → render polyfill 注入页面 app context
 */

const VUE_CDN_TEMPLATE = "https://unpkg.com/vue@VERSION/dist/vue.esm-browser.prod.js";
const VUE_CDN_FALLBACK = "https://unpkg.com/vue@3.2.37/dist/vue.esm-browser.prod.js";

async function findVueChunk() {
  const entry = document.querySelector("head>script[crossorigin]")?.src;
  if (!entry) throw new Error("Entry script not found");

  const entryText = await (await fetch(entry)).text();
  const resolveURL = (file) => entry.replace(/[^/]+$/, file);

  // 主界面: dynamic import("./index.xxx.js") 再跳转到二级 chunk
  // 播放器: 直接 static import from"./index.xxx.js"
  const dynamicMatch = entryText.match(/import\("\.\/(index\.[0-9a-z]{8}\.js).+?\1"/);
  const staticMatch = entryText.match(/from"\.\/(index\.[0-9a-z]{8}\.js)"/);
  const firstChunk = dynamicMatch?.[1] || staticMatch?.[1];
  if (!firstChunk) throw new Error("Vue chunk not found");

  const chunkText = await (await fetch(resolveURL(firstChunk))).text();

  // 旧版: runtime-dom 独立文件
  const legacyMatch = chunkText.match(/(.+?runtime-dom\.esm-bundler.+?;)/);
  if (legacyMatch) return { legacy: true, importLine: legacyMatch[1] };

  // 新版: 如果当前 chunk 就包含 __v_isVNode（是 Vue chunk），直接用
  if (chunkText.includes('__v_isVNode')) {
    return { legacy: false, url: resolveURL(firstChunk) };
  }

  // 否则找二级 chunk
  const secondMatch = chunkText.match(/from"\.\/((index)\.[0-9a-z]{8}\.js)"/);
  return { legacy: false, url: resolveURL(secondMatch ? secondMatch[1] : firstChunk) };
}

function parseExports(source) {
  const str = source.match(/export\{([^}]+)\}/)?.[1] || "";
  const entries = str.split(',').map(p => {
    const m = p.trim().match(/(\w+)\s+as\s+(\w+)/);
    return m ? [m[1], m[2]] : null;
  }).filter(Boolean);
  const find = (name) => entries.find(([n]) => n === name)?.[1];
  return { entries, find };
}

function findPageVueAPIs(source, mod, { find, entries }) {
  const result = {};

  // createApp
  const ca = source.match(/(\w+)\s*=\s*\(\.\.\.(\w+)\)\s*=>\s*\{[^}]*createApp/);
  if (ca) { const ex = find(ca[1]); if (ex) result.createApp = mod[ex]; }

  // h/createVNode
  for (const [, exported] of entries) {
    const fn = mod[exported];
    if (typeof fn !== 'function') continue;
    try { if (fn('div')?.__v_isVNode) { result.h = result.createVNode = fn; break; } } catch { }
  }

  // ref
  const rc = source.match(/class\s+(\w+)\s*\{[^}]*\.__v_isRef=!0/);
  if (rc) {
    const factory = source.match(new RegExp(`function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*new ${rc[1]}`));
    if (factory) {
      const wrappers = [...source.matchAll(new RegExp(`function\\s+(\\w+)\\s*\\(\\w+\\)\\s*\\{return\\s+${factory[1]}\\(`, 'g'))];
      for (const wm of wrappers) {
        const ex = find(wm[1]);
        if (ex && typeof mod[ex] === 'function') { result.ref = mod[ex]; break; }
      }
      if (!result.ref) {
        const ex = find(factory[1]);
        if (ex && typeof mod[ex] === 'function') result.ref = mod[ex];
      }
    }
  }

  // reactive
  const pi = source.indexOf('new Proxy(');
  if (pi !== -1) {
    const before = source.substring(Math.max(0, pi - 1000), pi);
    const fns = [...before.matchAll(/function\s+(\w+)\s*\(\w+(?:,\w+)*\)\s*\{/g)];
    const cro = fns.length ? fns[fns.length - 1][1] : null;
    if (cro) {
      const rm = source.match(new RegExp(`function\\s+(\\w+)\\s*\\(\\w+\\)\\s*\\{return\\s+${cro}\\(`));
      if (rm) { const ex = find(rm[1]); if (ex && typeof mod[ex] === 'function') result.reactive = mod[ex]; }
    }
  }

  // Fragment
  if (result.h) {
    for (const [, exported] of entries) {
      if (typeof mod[exported] !== 'symbol') continue;
      try {
        const vnode = result.h(mod[exported], null, [result.h('span')]);
        if (vnode?.__v_isVNode && Array.isArray(vnode.children) && vnode.children.length === 1) {
          result.Fragment = mod[exported];
          break;
        }
      } catch { }
    }
  }

  return result;
}

function createRenderPolyfill(createAppFn) {
  return (vnode, container) => {
    if (vnode === null) {
      if (container.__bl_app) {
        container.__bl_app.unmount();
        container.__bl_el?.remove();
        container.__bl_app = container.__bl_el = null;
      }
    } else {
      const el = document.createElement('div');
      container.appendChild(el);
      const app = createAppFn({ render: () => vnode });
      const pageApp = document.querySelector('#app')?.__vue_app__;
      if (pageApp) {
        app._context.components = pageApp._context.components;
        app._context.directives = pageApp._context.directives;
        app._context.provides = pageApp._context.provides;
      }
      app.mount(el);
      container.__bl_app = app;
      container.__bl_el = el;
    }
  };
}

export async function getVueRuntime() {
  try {
    const chunk = await findVueChunk();

    if (chunk.legacy) {
      const line = chunk.importLine.replace("./", `${location.origin}/assets/`);
      const names = [...line.matchAll(/[\s,{]([\w$]+)(?:\s+as\s+([\w$]+))?/g)];
      const exports = names.map(([, a, b]) => `  ${(b || a).replace(/\$\w+/, "")}: ${b || a},`).join("\n");
      const blob = new Blob([`${line}\nwindow.Vue = {\n${exports}\n};\nglobalThis.Vue = window.Vue;`], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const script = Object.assign(document.createElement("script"), { type: "module", src: url });
      document.head.appendChild(script);
      return new Promise((resolve, reject) => {
        script.onload = () => { URL.revokeObjectURL(url); resolve(null); };
        script.onerror = reject;
      });
    }

    const pageVersion = document.querySelector('#app')?.__vue_app__?.version;
    const cdnURL = pageVersion
      ? VUE_CDN_TEMPLATE.replace("VERSION", pageVersion)
      : VUE_CDN_FALLBACK;

    const [cdnVue, source, pageMod] = await Promise.all([
      import(cdnURL).catch(() => import(VUE_CDN_FALLBACK)),
      fetch(chunk.url).then(r => r.text()),
      import(chunk.url),
    ]);

    const exportTable = parseExports(source);
    const pageAPIs = findPageVueAPIs(source, pageMod, exportTable);

    const Vue = { ...cdnVue, ...pageAPIs };
    Vue.render = createRenderPolyfill(Vue.createApp);

    const expected = ['h', 'createApp', 'ref', 'reactive', 'Fragment'];
    const found = expected.filter(k => pageAPIs[k]);
    const missing = expected.filter(k => !pageAPIs[k]);
    if (missing.length) console.warn(`[BiliLoader] Vue API 未找到: ${missing.join(', ')}`);
    console.log(`[BiliLoader] Vue runtime loaded (${found.join(', ')})`);

    window.Vue = Vue;
    globalThis.Vue = Vue;
    return null;
  } catch (error) {
    console.error("[BiliLoader] Error loading Vue runtime:", error);
    throw error;
  }
}
