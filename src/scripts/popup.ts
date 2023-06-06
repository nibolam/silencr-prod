import { TabMessage } from "../tab-messsage";

const checkedAttribute = "checked";
const enableUpdatesElement = document.getElementById(
  "enableUpdates"
) as HTMLInputElement;

updateSettingsState();

enableUpdatesElement.addEventListener("mouseup", () => {
  /*
  This is brittle for the moment, the box will desync with the current state
  if a toggle command is sent with popup open. Tracking WI below.
  https://nbolam.atlassian.net/browse/SIL-52
  */
  chrome.runtime.sendMessage(TabMessage.BackgroundToggle);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message === TabMessage.RefreshToggleState) {
    updateSettingsState();
  }
});

function updateSettingsState() {
  chrome.storage.local.get().then((config) => {
    if (config.enableUpdates === true) {
      enableUpdatesElement.setAttribute(checkedAttribute, config.enableUpdates);
    } else {
      enableUpdatesElement.removeAttribute(checkedAttribute);
    }
  });
}
