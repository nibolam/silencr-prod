export type CustomVisionPredictionResponse = {
  predictions: CustomVisionPrediction[];
};

export type CustomVisionPrediction = {
  tagName: ClassifierCategory;
  probability: number;
};

export type CustomVisionTaggedImage = {
  id: string;
  created: string;
  width: number;
  height: number;
  resizedImageUri: string;
  thumbnailUri: string;
  originalImageUri: string;
  tags: CustomVisionImageTag[];
  // omitted regions and metadata here, shouldn't be needed
};

export type CustomVisionImageTag = {
  tagId: string;
  tagName: ClassifierCategory;
  created: string;
};

export enum ClassifierCategory {
  Ad = "AD",
  Negative = "Negative",
  Unknown = "Unknown",
}

export enum CustomVisionResourceType {
  Prediction,
  Training,
}
