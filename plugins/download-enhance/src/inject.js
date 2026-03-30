(function () {
  if (window.__bililoader_downloadEnhance) return;
  window.__bililoader_downloadEnhance = true;

  // 解锁原生设置页"同时缓存视频个数"的大会员限制
  // 原生逻辑：选择 >1 时检查 vipStatus，非大会员弹出大会员引导
  // 方案：hook callNative，当设置并行下载数时跳过 VIP 检查直接执行

  var origCallNative = window.biliBridgePc && window.biliBridgePc.callNative;
  if (!origCallNative) return;

  // 监听设置页上的下拉框选项点击
  // 原生代码在 requestBigVip 之前就 return 了，所以我们需要在 DOM 层面拦截
  // 在设置页的"同时缓存视频个数"下拉框选项上，绕过 VIP 检查直接设置

  document.addEventListener('click', function (e) {
    // 匹配下载数下拉框的选项
    var option = e.target.closest && e.target.closest('.download-num-dropdown .dropdown_select--option');
    if (!option) return;

    var title = option.querySelector('.dropdown_select--option-title');
    if (!title) return;

    var text = title.textContent || '';
    var match = text.match(/(\d+)/);
    if (!match) return;

    var num = parseInt(match[1], 10);
    if (isNaN(num) || num < 1) return;

    // 阻止原生点击事件（跳过 VIP 检查）
    e.stopPropagation();
    e.preventDefault();

    // 直接调用原生设置
    origCallNative('config/setDownloadConfig', { type: 'parallel', value: num });
  }, true);
})();
