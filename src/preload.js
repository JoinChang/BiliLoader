// 加载渲染进程
document.addEventListener("DOMContentLoaded", () => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = `local://root/src/renderer.js`;
    document.head.prepend(script);
});

// 运行外部脚本
Object.defineProperty(globalThis, "runPreloadScript", {
    configurable: false,
    value: (content) => {
        const fn = new Function(
            "require",
            "process",
            "Buffer",
            "global",
            "setImmediate",
            "clearImmediate",
            "exports",
            "module",
            content
        );

        const exports = {};
        const module = { exports };

        return fn(
            require,
            process,
            Buffer,
            globalThis,
            setImmediate,
            clearImmediate,
            exports,
            module
        );
    }
});

// 加载插件 Preload
(async () => {
    runPreloadScript(await (await fetch(`local://root/src/core/preload.js`)).text());
    runPreloadScript(await (await fetch(`local://root/src/plugin_loader/preload.js`)).text());
})();
