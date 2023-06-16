import { TabMessage } from "../tab-messsage";
import {
  ClassifierCategory,
  CustomVisionPrediction,
  CustomVisionPredictionResponse,
} from "../custom-vision-types";
import { meetsSwitchThreshold as meetsSwitchThresholdExport } from "./update-volume";
import { UPDATE_INTERVAL_MILLIS } from "../dev-flags";
import { updateFunction } from "./update-function";

const HIGH_CONFIDENCE_THRESHOLD = 0.975;
const encodingErrorName = "EncodingError";
var loopIntervalTimer: NodeJS.Timeout;
var prevTag: ClassifierCategory;

/**
 * Toggles mute status updates & unmutes the tab when toggling off.
 *
 * @param idempotentOff If true we force the toggle to the off state.
 */
export async function toggle(idempotentOff: boolean = false) {
  let updatesEnabled: boolean = await chrome.storage.local
    .get()
    .then((settings) => {
      if (settings.enableUpdates === true) {
        return true;
      } else {
        return false;
      }
    });

  // Force toggle to off state
  if (idempotentOff) updatesEnabled = true;
  clearInterval(loopIntervalTimer);

  if (updatesEnabled) {
    chrome.runtime.sendMessage(TabMessage.Unmute);
  } else {
    loopIntervalTimer = setInterval(updateVolume, UPDATE_INTERVAL_MILLIS);
  }

  chrome.storage.local.set({
    enableUpdates: !updatesEnabled,
  });
}

/**
 * Sends a message to the background process to change the tab mute state if we're confident enough
 * of the current image tag. Otherwise don't send a message.
 *
 * This is only exported for testing purposes, it isn't and shouldn't be used outside this file.
 * @param response Prediction response from the model
 */
export function sendMuteStateMessage(response: CustomVisionPredictionResponse) {
  let topTagPrediction = response.predictions[0];
  if (
    meetsSwitchThresholdExport(ClassifierCategory.Ad, topTagPrediction, prevTag)
  ) {
    chrome.runtime.sendMessage(TabMessage.Mute);
  } else if (
    meetsSwitchThresholdExport(
      ClassifierCategory.Negative,
      topTagPrediction,
      prevTag
    )
  ) {
    chrome.runtime.sendMessage(TabMessage.Unmute);
  }

  prevTag = topTagPrediction.tagName;
}

/**
 * Determines whether the given prediction warrants changing the mute state for the given target tag.
 *
 * This is only exported for testing purposes, it isn't and shouldn't be used outside this file.
 * @param targetTag Target image tag.
 * @param prediction Image tag prediction.
 * @param previousTag Image tag predicted by the previous prediction.
 * @returns A boolean indicating whether the mute state should be changed to the state associated with the targetTag.
 */
export function meetsSwitchThreshold(
  targetTag: ClassifierCategory,
  prediction: CustomVisionPrediction,
  previousTag: ClassifierCategory
): boolean {
  if (targetTag === prediction.tagName) {
    if (
      targetTag === previousTag ||
      Number(prediction.probability) > HIGH_CONFIDENCE_THRESHOLD
    ) {
      return true;
    }
  }

  return false;
}

function updateVolume() {
  updateFunction()
    .then((response) => {
      sendMuteStateMessage(response);
    })
    .catch((error) => {
      // These are known & expected errors that have no known customer impact.
      // They occur when users switch the activeTab away from the platform tab
      if (error.name !== encodingErrorName) {
        throw error;
      }
    });
}
