import {BaseComponent, Margin} from "./BaseComponent.js";

export class Tabs extends BaseComponent {
    constructor({
        defaultValue = "",
        tabs = [
            // { label: "Tab 1", value: "tab1" },
        ],
        onTabChange = () => {},
        margin = {
            marginTop: Margin.XS,
            marginRight: Margin.NONE,
            marginBottom: Margin.NONE,
            marginLeft: Margin.NONE,
        },
    }) {
        super({ margin });

        this._component = app.__vue_app__.component("VTabs");
        this._props = {
            activeKey: defaultValue,
            activePink: true,
            tabsGutter: 30,
            sliderWidth: 18,
            slideToHover: false,
            noPaddingLeft: false,
            autoAdjustment: false,
            onTabChange: (val) => {
                onTabChange(val);
            },
        };
        this._slots = {
            default: () => tabs.map((tab) => {
                return Vue.h(app.__vue_app__.component("VTabItem"), {
                    key: tab.value,
                    tab: tab.label,
                    disabled: tab.disabled || false,
                }, {
                    default: () => tab.label,
                });
            }),
        }
    }
}
