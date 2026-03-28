// 通用辅助函数

function text(content) {
  return [{ type: "text", text: content }];
}

function image(base64Data) {
  return [{ type: "image", data: base64Data, mimeType: "image/png" }];
}

function wrapIframe(expression) {
  return `(() => {
    const iframe = document.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) throw new Error('未找到 iframe');
    const _doc = iframe.contentDocument;
    const _win = iframe.contentWindow;
    with (_win) { return (${expression}); }
  })()`;
}

async function evaluate(cdp, expression, { iframe = false, awaitPromise = false, returnByValue = true } = {}) {
  let expr = iframe ? wrapIframe(expression) : expression;
  // 自动包装 async：如果表达式包含 await 关键字，包裹为 async IIFE
  if (awaitPromise && expr.includes('await') && !expr.trimStart().startsWith('(async')) {
    expr = `(async () => { ${expr} })()`;
  }
  const result = await cdp.send("Runtime.evaluate", {
    expression: expr,
    returnByValue,
    awaitPromise,
  });
  if (result.exceptionDetails) {
    const msg = result.exceptionDetails.exception?.description
      || result.exceptionDetails.text
      || "执行失败";
    throw new Error(msg);
  }
  return result.result.value;
}

const TARGET_PATTERNS = {
  main: url => url.includes("index.html"),
  player: url => url.includes("player.html"),
  live: url => url.includes("live.bilibili.com"),
};

function findTarget(targets, keyword) {
  const pattern = TARGET_PATTERNS[keyword];
  if (pattern) return targets.find(t => t.type === "page" && pattern(t.url));
  return targets.find(t => t.type === "page" && t.url.includes(keyword));
}

module.exports = { text, image, evaluate, findTarget };
