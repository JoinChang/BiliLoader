// CDN 节点列表：本地快照（随插件分发）+ 运行时从本项目仓库拉取最新快照
// 快照由 scripts/update-cdn-nodes.mjs 抓取生成，经 GitHub Action 定时更新并提交
const REMOTE_URL = "https://raw.githubusercontent.com/JoinChang/BiliLoader/main/plugins/bililoader-extension/assets/cdn-nodes.json";
const BUNDLED_ASSET = "cdn-nodes.json";
const CACHE_KEY = "bl-custom-cdn-nodes";
const CACHE_TTL = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT = 4000;

function isValidNodeData(data) {
  return !!data && typeof data === "object" && !Array.isArray(data) &&
    Object.values(data).every(v => Array.isArray(v) && v.every(h => typeof h === "string"));
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (cached && isValidNodeData(cached.data)) return cached;
  } catch { }
  return null;
}

async function fetchRemote() {
  const res = await fetch(REMOTE_URL, { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT) });
  const data = await res.json();
  if (!isValidNodeData(data)) throw new Error("invalid node data");
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data })); } catch { }
  return data;
}

async function loadBundled(assets) {
  const data = JSON.parse(await assets.text(BUNDLED_ASSET));
  if (!isValidNodeData(data)) throw new Error("invalid bundled node data");
  return data;
}

let memo = null;

export async function getCdnNodes(assets, { force = false } = {}) {
  if (memo && !force) return memo;

  const cached = readCache();
  if (!force && cached && Date.now() - cached.time < CACHE_TTL) {
    return (memo = cached.data);
  }

  try {
    return (memo = await fetchRemote());
  } catch { }

  if (cached) return (memo = cached.data);

  try {
    return (memo = await loadBundled(assets));
  } catch { }

  return (memo = {});
}

// 点播节点为 upos- 前缀的云镜像，其余为直播边缘节点
export function filterNodesByType(nodes, type) {
  const result = {};
  for (const [region, hosts] of Object.entries(nodes)) {
    const filtered = hosts.filter(h => type === "video" ? h.startsWith("upos-") : !h.startsWith("upos-"));
    if (filtered.length > 0) result[region] = filtered;
  }
  return result;
}

export function findRegionOf(nodes, host) {
  for (const [region, hosts] of Object.entries(nodes)) {
    if (hosts.includes(host)) return region;
  }
  return null;
}
