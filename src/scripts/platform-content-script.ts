import { TabMessage } from "../tab-messsage";
import { initializeModels } from "./tf-models";
import { toggle } from "./update-volume";
import { ENABLE_UPDATES_ON_LOAD } from "../dev-flags";

async function main() {
  // Initialize CV models
  await initializeModels();

  // Initialize this as the "active" tab for the extension
  chrome.runtime.sendMessage(TabMessage.Init);

  // Toggle volume updates
  if (ENABLE_UPDATES_ON_LOAD) toggle(true);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message === TabMessage.ToggleUpdates) {
    toggle().then(() => {
      // Refresh the checkbox state in the popup
      chrome.runtime.sendMessage(TabMessage.RefreshToggleState);
    });
  }
});

main();
