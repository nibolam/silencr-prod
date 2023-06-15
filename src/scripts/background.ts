import { TabMessage } from "../tab-messsage";

chrome.runtime.onMessage.addListener((message, sender, res) => {
  /*
  Background toggle messages can be sent from the popup without
  a tabId, so this handling must happen before tabId validation.
  */
  if (message === TabMessage.BackgroundToggle) {
    sendToggleMessageToTab();
    return;
  }

  if (sender.tab?.id === undefined) return;
  const tabId: number = sender.tab.id;

  if (message === TabMessage.Classify && sender.tab.active) {
    chrome.tabs
      .captureVisibleTab(sender.tab.windowId, { format: "jpeg" })
      .then((image) => {
        res(image);
      });
    return true;
  } else if (message === TabMessage.Init) {
    chrome.storage.local.set({ activeTabId: `${tabId}` });
  } else if (message === TabMessage.Mute) {
    chrome.tabs.update(tabId, { muted: true });
  } else if (message === TabMessage.Unmute) {
    chrome.tabs.update(tabId, { muted: false });
  }

  return;
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle") {
    sendToggleMessageToTab();
  }
});

function sendToggleMessageToTab() {
  chrome.storage.local.get().then((config) => {
    if (config.activeTabId) {
      chrome.tabs.sendMessage(
        parseInt(config.activeTabId),
        TabMessage.ToggleUpdates
      );
    }
  });
}
