// SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知)
export const shouldMarkDeveloperNewsReadOnPaneChange = (
  wasExpanded: boolean,
  isExpanded: boolean,
): boolean => wasExpanded && !isExpanded;
