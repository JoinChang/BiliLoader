// 抓取哔哩哔哩 CDN 节点子域并按地区归类，累积合并进 assets/cdn-nodes.json。
// 由 update-cdn-nodes.yml 定时运行；分类逻辑参考 https://github.com/Kanda-Akihito-Kun/ccb。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, "..", "plugins", "bililoader-extension", "assets", "cdn-nodes.json");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

// 首个匹配的缩写决定地区归属，顺序敏感
const REGION_PATTERNS = [
  ["-bj", "北京"], ["-sh-", "上海"], ["-gd", "广东"], ["-sz-", "深圳"],
  ["-fj", "福建"], ["-hbsjz-", "河北"], ["-hblf-", "河北"], ["-hlj", "黑龙江"],
  ["-hnzz-", "河南"], ["-hbwh-", "湖北"], ["-hbyc-", "湖北"], ["-hncs-", "湖南"],
  ["-jsnj-", "江苏"], ["-jssz-", "江苏"], ["-jx", "江西"], ["-ln", "辽宁"],
  ["-nmg", "内蒙古"], ["-sd", "山东"], ["-sxty-", "山西"], ["-sxxa-", "陕西"],
  ["-sc", "四川"], ["-cq", "重庆"], ["-tj-", "天津"], ["-xj-", "新疆"],
  ["-zj", "浙江"], ["-gotcha", "外建"], ["-hk-", "香港"], ["-kaigai-", "海外"],
];

// 部分节点无法通过子域枚举发现，固定补充
const EXTRA_NODES = {
  "海外": [
    "upos-hz-mirrorakam.akamaized.net",
    "upos-sz-mirroraliov.bilivideo.com",
    "upos-sz-mirrorcosov.bilivideo.com",
    "upos-sz-mirror08h.bilivideo.com",
  ],
  "福建": [
    "cn-fjfz-fx-01-01.bilivideo.com", "cn-fjfz-fx-01-02.bilivideo.com",
    "cn-fjfz-fx-01-03.bilivideo.com", "cn-fjfz-fx-01-04.bilivideo.com",
    "cn-fjfz-fx-01-05.bilivideo.com", "cn-fjfz-fx-01-06.bilivideo.com",
  ],
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function normalize(sub) {
  sub = sub.trim();
  if (!sub || sub.includes(".")) return sub;
  return sub + ".bilivideo.com";
}

// 含 origin/all 的节点是回源/全量域名，直连不稳定，排除
function isUnsafe(host) {
  const h = host.toLowerCase();
  return h.includes("origin") || h.includes("all");
}

async function fetchChaziyu() {
  const subs = new Set();
  for (let page = 0; page < 25; page++) {
    if (page > 0) await sleep(1000);
    try {
      const res = await fetch(`https://chaziyu.com/ipchaxun.do?domain=bilivideo.com&page=${page}`, {
        headers: { "User-Agent": UA, "Referer": "https://chaziyu.com/" },
      });
      const json = await res.json();
      for (const s of json?.data?.result || []) subs.add(s);
    } catch (e) {
      console.warn(`chaziyu 第 ${page} 页失败: ${e.message}`);
    }
  }
  if (subs.size < 50) throw new Error(`chaziyu 子域数量过少: ${subs.size}`);
  return [...subs];
}

async function fetchSrcLab() {
  const res = await fetch("https://srclab.cn/api/server/dnsDetect/?domain=bilivideo.com", {
    headers: { "User-Agent": UA, "Accept": "application/json" },
  });
  const json = await res.json();
  if (json?.status !== 1) throw new Error(`srclab 状态异常: ${json?.error || json?.status}`);
  const subs = json?.data?.subdomains || [];
  if (subs.length < 50) throw new Error(`srclab 子域数量过少: ${subs.length}`);
  return subs;
}

async function fetchSubDomains() {
  try {
    return await fetchChaziyu();
  } catch (e) {
    console.warn(`chaziyu 更新失败，尝试 srclab: ${e.message}`);
  }
  return await fetchSrcLab();
}

function readExisting() {
  try {
    const cdnMap = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
    for (const region of Object.keys(cdnMap)) {
      cdnMap[region] = cdnMap[region].filter(h => !isUnsafe(h));
    }
    return cdnMap;
  } catch {
    return {};
  }
}

function addNode(cdnMap, region, host) {
  if (!host || isUnsafe(host)) return false;
  if (!cdnMap[region]) cdnMap[region] = [];
  if (cdnMap[region].includes(host)) return false;
  cdnMap[region].push(host);
  return true;
}

async function main() {
  const cdnMap = readExisting();

  let subDomains;
  try {
    subDomains = await fetchSubDomains();
  } catch (e) {
    if (Object.keys(cdnMap).length === 0) {
      console.error(`所有数据源均失败，且无现有快照可保留: ${e.message}`);
      process.exit(1);
    }
    console.warn(`所有数据源均失败，保留现有快照: ${e.message}`);
    return;
  }

  let added = 0;
  for (const raw of subDomains) {
    const host = normalize(raw);
    const match = REGION_PATTERNS.find(([abbr]) => host.includes(abbr));
    if (match && addNode(cdnMap, match[1], host)) added++;
  }
  for (const [region, hosts] of Object.entries(EXTRA_NODES)) {
    for (const host of hosts) if (addNode(cdnMap, region, host)) added++;
  }

  for (const region of Object.keys(cdnMap)) cdnMap[region].sort();

  const total = Object.values(cdnMap).reduce((s, a) => s + a.length, 0);
  fs.writeFileSync(OUTPUT, JSON.stringify(cdnMap, null, 2) + "\n");
  console.log(`发现 ${subDomains.length} 个子域，新增 ${added} 个，快照共 ${Object.keys(cdnMap).length} 地区 ${total} 节点`);
}

main().catch(e => { console.error(e); process.exit(1); });
