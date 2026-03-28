function createFilterSection(h, { label, configKey, regexConfigKey, config, PillGroup, TextInput, Checkbox, Spoiler }) {
  const items = (config.get(configKey) || []).map(v => typeof v === "string" ? { label: v, value: v } : v);

  const pillGroup = new PillGroup({
    items,
    onRemove: (_, remaining) => {
      config.set(configKey, remaining.map(i => i.value));
    },
  });

  const inputVNode = new TextInput({
    placeholder: "输入后按回车添加",
    onSubmit: (val) => {
      pillGroup.addItem(val);
      const current = config.get(configKey) || [];
      if (!current.includes(val)) {
        config.set(configKey, [...current, val]);
      }
    },
  }).renderVNode();

  const inputRow = regexConfigKey
    ? h("div", { style: "display: flex; align-items: center; gap: 12px;" }, [
        inputVNode,
        new Checkbox({
          label: "正则模式",
          defaultValue: config.get(regexConfigKey),
          onChange: (v) => config.set(regexConfigKey, v),
        }).renderVNode(),
      ])
    : inputVNode;

  const pillVNode = new Spoiler({
    children: [pillGroup],
    collapsedHeight: 90,
  }).renderVNode();

  return h("div", { class: "mt_md" }, [
    h("p", { class: "b_text text2" }, label),
    h("div", { class: "mt_sm" }, [inputRow]),
    pillVNode,
  ]);
}

export function showAdvancedFilterDialog(config) {
  const { Checkbox, ContentDialog, PillGroup, Spoiler, TextInput } = window.BiliComponents;
  const opts = { config, PillGroup, TextInput, Checkbox, Spoiler };

  new ContentDialog({
    title: "高级过滤",
    width: 620,
    content: (h) => h("div", {
      class: "scrollbar_sm",
      style: "max-height: 60vh; overflow-y: auto;",
    }, [
      createFilterSection(h, { ...opts, label: "屏蔽标题关键词", configKey: "filter-title", regexConfigKey: "filter-title-regex" }),
      createFilterSection(h, { ...opts, label: "屏蔽推荐理由", configKey: "filter-reason", regexConfigKey: "filter-reason-regex" }),
      createFilterSection(h, { ...opts, label: "屏蔽 UID", configKey: "filter-uid", regexConfigKey: null }),
      createFilterSection(h, { ...opts, label: "屏蔽 UP 主", configKey: "filter-upname", regexConfigKey: "filter-upname-regex" }),
    ]),
  }).show();
}
