export class Toast {
  static show({ content, duration = 2000 } = {}) {
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "base_toast base_toast--transition-enter-from";
      el.style.cssText = "z-index: 10000; display: flex; align-items: center;";
      el.textContent = content;
      document.body.appendChild(el);

      requestAnimationFrame(() => {
        el.classList.add("base_toast--transition-enter-active");
        el.classList.remove("base_toast--transition-enter-from");
      });

      setTimeout(() => {
        el.classList.add("base_toast--transition-leave-active", "base_toast--transition-leave-to");
        const onEnd = () => {
          el.remove();
          resolve();
        };
        el.addEventListener("transitionend", onEnd, { once: true });
        setTimeout(onEnd, 400);
      }, duration);
    });
  }
}
