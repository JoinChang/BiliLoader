function setTheme(theme) {
  document.documentElement.classList.toggle("bili_dark", theme === "dark");
  try {
    const provides = app.__vue_app__._context.provides;
    for (const s of Object.getOwnPropertySymbols(provides)) {
      const store = provides[s]?._s?.get("appInfoStore");
      if (store) { store.appTheme = theme; break; }
    }
  } catch {}
}

export const onReady = () => {
  if (!window.biliBridgePc) return;

  window.biliBridgePc.addListener("window/updateMainWindowTheme", ({ data }) => setTheme(data));

  document.addEventListener("click", (e) => {
    if (!e.target.closest?.(".settings-item.theme")) return;
    e.stopImmediatePropagation();
    const next = document.documentElement.classList.contains("bili_dark") ? "light" : "dark";
    setTheme(next);
    window.biliBridgePc.callNative("config/setMainWindowTheme", next);
  }, true);
};
