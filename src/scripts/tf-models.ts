import * as tf from "@tensorflow/tfjs";
import {
  ClassifierCategory,
  CustomVisionPredictionResponse,
} from "../custom-vision-types";
import { ENABLE_VERBOSE_LOGGING } from "../dev-flags";

const MOBILE_NET_INPUT_WIDTH = 224;
const MOBILE_NET_INPUT_HEIGHT = 224;

const CLASS_NAMES = [ClassifierCategory.Ad, ClassifierCategory.Negative];

const MOBILENET_MODEL_URL =
  "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_large_100_224/feature_vector/5/default/1";
const AZURE_MODEL_URL =
  "https://silencrmodelstore.blob.core.windows.net/all-sport-model/model002.json";

let mobilenet: tf.GraphModel;
let model: tf.Sequential;

/**
 * Classifies the input image into a {@link ClassifierCategory}. The image is first passed through a generic pretrained TensorFlowJS model (mobileNet v3),
 * then a custom {@link tf.Sequential} model which was trained specifically for this purpose.
 *
 * @param inputImage Still frame from a stream as an {@link HTMLImageElement}.
 * @returns A {@link CustomVisionPredictionResponse} object containing the classification probability for the most likely {@link ClassifierCategory}.
 */
export async function getLocalPrediction(
  inputImage: HTMLImageElement
): Promise<CustomVisionPredictionResponse> {
  const predictionArray = tf.tidy(() => {
    const formattedImage = formatImage(inputImage);
    const imageFeatures = mobilenet.predict(formattedImage) as tf.Tensor;
    const prediction = (model.predict(imageFeatures) as tf.Tensor).squeeze();
    return prediction.arraySync() as number[];
  });

  const highestIndex = tf.tidy(() => {
    return tf.argMax(predictionArray).arraySync() as number;
  });

  if (ENABLE_VERBOSE_LOGGING) {
    let predictionStatusText =
      "Prediction: " +
      CLASS_NAMES[highestIndex] +
      " with " +
      Math.floor(predictionArray[highestIndex] * 100) +
      "% confidence";

    console.log(predictionStatusText);
    console.log("tf numBytes: " + tf.memory().numBytes);
    console.log("tf numTensors: " + tf.memory().numTensors);
    console.log("tf numDataBuffers: " + tf.memory().numDataBuffers);
  }

  // We only care about the highest probability class
  return {
    predictions: [
      {
        tagName: CLASS_NAMES[highestIndex],
        probability: Math.floor(predictionArray[highestIndex] * 100),
      },
    ],
  };
}

/**
 * Formats and normalizes a given image for input into mobilenet v3.
 *
 * @param inputImage Still frame from a stream as an {@link HTMLImageElement}.
 * @returns A {@link tf.Tensor} for input into mobilenet v3.
 */
function formatImage(inputImage: HTMLImageElement): tf.Tensor {
  let imageTensor: tf.Tensor3D;
  imageTensor = tf.browser.fromPixels(inputImage);
  imageTensor = tf.image.resizeBilinear(
    imageTensor,
    [MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH],
    true
  );

  imageTensor = imageTensor.div(255);
  imageTensor = imageTensor.expandDims();

  return imageTensor;
}

/**
 * Loads the mobilenet v3 TensorFlow graphModel from the TFJS model hub and warms it up.
 */
async function loadMobileNetFeatureModel() {
  mobilenet = await tf.loadGraphModel(MOBILENET_MODEL_URL, { fromTFHub: true });

  // Warm up the model by passing zeros through it once.
  tf.tidy(function () {
    mobilenet.predict(
      tf.zeros([1, MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH, 3])
    );
  });
}

/**
 * Loads the custom model from Azure blob storage.
 */
async function loadCustomTfModel() {
  model = (await tf.loadLayersModel(AZURE_MODEL_URL)) as tf.Sequential;
}

/**
 * Loads & initializes both required TensorFlow models.
 */
export async function initializeModels() {
  await Promise.all([loadMobileNetFeatureModel(), loadCustomTfModel()]);
}
