export function waitForVueAppContext(timeout = 3000) {
    return new Promise((resolve, reject) => {
        const getContext = () => window.app?.__vue_app__?._context;

        if (getContext()) return resolve(getContext());

        const interval = setInterval(() => {
            const ctx = getContext();
            if (ctx) {
                clearInterval(interval);
                resolve(ctx);
            }
        }, 50);

        setTimeout(() => {
            clearInterval(interval);
            reject(new Error("Vue app context not available"));
        }, timeout);
    });
}
