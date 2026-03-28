export class AssetsManager {
  constructor(pluginId) {
    this.pluginId = pluginId;
    this._base = `local://plugin/${pluginId}`;
    this._cache = {};
  }

  url(path) {
    return `${this._base}/${path}`;
  }

  async text(path) {
    if (this._cache[path]) return this._cache[path];
    const resp = await fetch(this.url(path));
    if (!resp.ok) throw new Error(`资源加载失败: ${path} (${resp.status})`);
    const text = await resp.text();
    this._cache[path] = text;
    return text;
  }
}

Object.defineProperty(window, "BiliAssetsManager", { value: AssetsManager, writable: false, configurable: false });
