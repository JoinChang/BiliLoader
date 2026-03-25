const GITHUB_REPO = "JoinChang/BiliLoader";
const RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

function compareVersions(current, latest) {
  const parse = (v) => v.replace(/^v/, "").split(".").map(Number);
  const c = parse(current), l = parse(latest);
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const diff = (l[i] || 0) - (c[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function checkUpdate() {
  const res = await fetch(RELEASE_API);
  if (!res.ok) throw new Error(`GitHub API 请求失败: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const latest = data.tag_name;
  const current = BiliLoader.versions.bili_loader;
  return {
    hasUpdate: compareVersions(current, latest) > 0,
    current,
    latest,
    body: data.body || "",
    url: data.html_url,
    zipUrl: data.zipball_url,
  };
}
