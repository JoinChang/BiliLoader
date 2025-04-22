export async function getVueRuntime(vueRuntimeURL = null) {
    try {
        if (!vueRuntimeURL) {
            const entryScript = document.querySelector("head>script[crossorigin]").src;
            let response = await fetch(entryScript);
            let text = await response.text();

            const vueRuntimePathMatch = text.match(/import\("\.\/(index\.[0-9a-z]{8}\.js).+?\1"/);
            if (!vueRuntimePathMatch) throw new Error("Vue runtime path not found");
            const vueRuntimePath = vueRuntimePathMatch[1];

            response = await fetch(entryScript.replace(/index\.[0-9a-z]{8}\.js/, vueRuntimePath));
            text = await response.text();

            const importLineMatch = text.match(/(.+?runtime-dom\.esm-bundler.+?;)/);
            if (!importLineMatch) throw new Error("Vue runtime import line not found");
            let importLine = importLineMatch[1];
            importLine = importLine.replace("./", `${location.origin}/assets/`);

            const matches = [...importLine.matchAll(/[\s,{]([\w$]+)(?:\s+as\s+([\w$]+))?/g)];
            const exportLines = matches.map(([, importName, exportName]) => {
                const n = exportName || importName;
                return `  ${n.replace(/\$[a-zA-Z0-9]+/, "")}: ${n},`;
            }).join('\n');

            const vueRuntimeBlob = new Blob([
                `${importLine}\n\nexport const VueRuntime = {\n${exportLines}\n};window.Vue = VueRuntime;globalThis.Vue = VueRuntime;`,
            ], { type: "text/javascript" });

            vueRuntimeURL = URL.createObjectURL(vueRuntimeBlob);
        }

        const vueRuntimeScript = document.createElement("script");
        vueRuntimeScript.type = "module";
        vueRuntimeScript.src = vueRuntimeURL;
        document.head.appendChild(vueRuntimeScript);

        return new Promise((resolve) => {
            vueRuntimeScript.onload = () => {
                // URL.revokeObjectURL(vueRuntimeURL);
                resolve(vueRuntimeURL);
            };
        });
    } catch (error) {
        console.error("Error loading Vue runtime:", error);
        throw error;
    }
}
