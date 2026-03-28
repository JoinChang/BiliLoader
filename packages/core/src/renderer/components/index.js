/*
 * 导出包装后的组件
 */
import { BaseComponent, Margin } from "./BaseComponent.js";
import { Button, ButtonColor, ButtonSize } from "./Button.js";
import { Checkbox, CheckboxColor, CheckboxSize } from "./Checkbox.js";
import { CheckboxGroup } from "./CheckboxGroup.js";
import { ConfirmDialog, ContentDialog } from "./Dialog.js";
import { Pill } from "./Pill.js";
import { PillGroup } from "./PillGroup.js";
import { FlexRow } from "./Flex.js";
import { Notification, NotificationPosition } from "./Notification.js";
import { Radio } from "./Radio.js";
import { RadioGroup } from "./RadioGroup.js";
import { Spoiler } from "./Spoiler.js";
import { Tabs } from "./Tabs.js";
import { Text } from "./Text.js";
import { Title } from "./Title.js";
import { TextInput, TextInputSize } from "./TextInput.js";
import { Toast } from "./Toast.js";
import { Tooltip } from "./Tooltip.js";

const Components = {
  BaseComponent, Button, ButtonColor, ButtonSize,
  Checkbox, CheckboxColor, CheckboxGroup, CheckboxSize,
  ConfirmDialog, ContentDialog, FlexRow, Margin,
  Notification, NotificationPosition, Pill, PillGroup,
  Radio, RadioGroup, Spoiler, Tabs, Text, TextInput, TextInputSize,
  Title, Toast, Tooltip,
};

export {
  BaseComponent, Button, ButtonColor, ButtonSize,
  Checkbox, CheckboxColor, CheckboxGroup, CheckboxSize,
  ConfirmDialog, ContentDialog, FlexRow, Margin,
  Notification, NotificationPosition, Pill, PillGroup,
  Radio, RadioGroup, Spoiler, Tabs, Text, TextInput, TextInputSize,
  Title, Toast, Tooltip,
};

export default Components;
