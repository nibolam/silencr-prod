import { getLocalPrediction } from "./tf-models";
import { CustomVisionPredictionResponse } from "../custom-vision-types";
import { TabMessage } from "../tab-messsage";

/**
 * Updates the tab's mute status based on a prediction from the local TensorFlow models.
 */
function updateVolumeLocally(): Promise<CustomVisionPredictionResponse> {
  return chrome.runtime
    .sendMessage(TabMessage.Classify)
    .then((resultImage: string) => {
      return imageStringToHTMLElement(resultImage);
    })
    .then((htmlImageElement) => {
      return getLocalPrediction(htmlImageElement);
    });
}

function imageStringToHTMLElement(
  inputImage: string
): Promise<HTMLImageElement> {
  let htmlImage = new Image();
  htmlImage.src = inputImage;
  return htmlImage.decode().then(() => {
    return htmlImage;
  });
}

export { updateVolumeLocally as updateFunction };
