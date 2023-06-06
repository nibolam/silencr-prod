import {
  jest,
  describe,
  beforeEach,
  afterEach,
  test,
  expect,
} from "@jest/globals";
import { ClassifierCategory } from "../src/custom-vision-types";
import { chrome } from "jest-chrome";
import { TabMessage } from "../src/tab-messsage";

let UpdateModule;

const mockClassifierResponse = {
  predictions: [{ tagName: ClassifierCategory.Ad, probability: 0.05 }],
};

const mockClassifierNegativeResponse = {
  predictions: [{ tagName: ClassifierCategory.Negative, probability: 0.05 }],
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("meetsSwitchThreshold", () => {
  beforeEach(() => {
    import("../src/scripts/update-volume").then((module) => {
      UpdateModule = module;
      jest.resetModules();
    });
  });

  test("with high confidence returns true", () => {
    let result = UpdateModule.meetsSwitchThreshold(
      ClassifierCategory.Ad,
      { tagName: ClassifierCategory.Ad, probability: 0.99 },
      ClassifierCategory.Negative
    );

    expect(result).toBe(true);
  });

  test("with repeated tag returns true", () => {
    let result = UpdateModule.meetsSwitchThreshold(
      ClassifierCategory.Ad,
      { tagName: ClassifierCategory.Ad, probability: 0.64 },
      ClassifierCategory.Ad
    );

    expect(result).toBe(true);
  });

  test("with different tag returns false", () => {
    let result = UpdateModule.meetsSwitchThreshold(
      ClassifierCategory.Negative,
      { tagName: ClassifierCategory.Ad, probability: 0.99 },
      ClassifierCategory.Ad
    );

    expect(result).toBe(false);
  });

  test("with single low confidence tag returns false", () => {
    let result = UpdateModule.meetsSwitchThreshold(
      ClassifierCategory.Ad,
      { tagName: ClassifierCategory.Ad, probability: 0.64 },
      ClassifierCategory.Negative
    );

    expect(result).toBe(false);
  });
});

describe("sendMuteStateMessage", () => {
  let sendMessageSpy;
  beforeEach(() => {
    sendMessageSpy = jest
      .spyOn(chrome.runtime, "sendMessage")
      .mockImplementation((tabMessage) => {
        return;
      });
  });

  test("send mute when meets AD threshold", async () => {
    await mockThresholdForTag(ClassifierCategory.Ad);

    await UpdateModule.sendMuteStateMessage(mockClassifierResponse);

    expect(sendMessageSpy.mock.calls[0][0]).toBe(TabMessage.Mute);
  });

  test("send unmute when meets Negative threshold", async () => {
    await mockThresholdForTag(ClassifierCategory.Negative);

    await UpdateModule.sendMuteStateMessage(mockClassifierResponse);

    expect(sendMessageSpy.mock.calls[0][0]).toBe(TabMessage.Unmute);
  });

  test("updates prevTag", async () => {
    await mockThresholdForTag(ClassifierCategory.Ad);

    await UpdateModule.sendMuteStateMessage(mockClassifierResponse);
    await UpdateModule.sendMuteStateMessage(mockClassifierNegativeResponse);
    await UpdateModule.sendMuteStateMessage(mockClassifierResponse);

    expect(UpdateModule.meetsSwitchThreshold.mock.calls[1][2]).toBe(
      ClassifierCategory.Ad
    );
    expect(UpdateModule.meetsSwitchThreshold.mock.calls[2][2]).toBe(
      ClassifierCategory.Negative
    );
  });

  test("send no messages if no threshold met", async () => {
    await mockThresholdForTag(ClassifierCategory.Unknown);

    await UpdateModule.sendMuteStateMessage(mockClassifierResponse);

    expect(sendMessageSpy.mock.calls).toHaveLength(0);
  });
});

describe("toggle", () => {
  let setIntervalSpy,
    clearIntervalSpy,
    sendMessageSpy,
    getStorageSpy,
    setStorageSpy;
  let isToggled: boolean = false;
  beforeEach(() => {
    setIntervalSpy = jest.spyOn(global, "setInterval");

    clearIntervalSpy = jest.spyOn(global, "clearInterval");

    sendMessageSpy = jest
      .spyOn(chrome.runtime, "sendMessage")
      .mockImplementation((tabMessage) => {
        return;
      });

    getStorageSpy = jest
      .spyOn(chrome.storage.local, "get")
      .mockImplementation(() => {
        return Promise.resolve({ enableUpdates: isToggled });
      });

    getStorageSpy = jest
      .spyOn(chrome.storage.local, "set")
      .mockImplementation((settings) => {
        isToggled = (<{ enableUpdates: boolean }>settings).enableUpdates;
      });

    import("../src/scripts/update-volume").then((module) => {
      UpdateModule = module;
      jest.resetModules();
    });
  });

  test("basic success cases", async () => {
    await UpdateModule.toggle();
    await UpdateModule.toggle();
    await UpdateModule.toggle();
    await UpdateModule.toggle();

    expect(setIntervalSpy.mock.calls).toHaveLength(2);

    expect(clearIntervalSpy.mock.calls).toHaveLength(4);
    expect(clearIntervalSpy.mock.calls[0][0]).toBe(undefined);
    expect(clearIntervalSpy.mock.calls[1][0]).toBe(
      setIntervalSpy.mock.results[0].value
    );
    expect(clearIntervalSpy.mock.calls[2][0]).toBe(
      setIntervalSpy.mock.results[0].value
    );
    expect(clearIntervalSpy.mock.calls[3][0]).toBe(
      setIntervalSpy.mock.results[1].value
    );

    expect(sendMessageSpy.mock.calls).toHaveLength(2);
    expect(sendMessageSpy.mock.calls[0][0]).toBe(TabMessage.Unmute);
    expect(sendMessageSpy.mock.calls[1][0]).toBe(TabMessage.Unmute);
  });
});

async function mockThresholdForTag(threshTag: ClassifierCategory) {
  const mockThresholdFn = jest.fn((targetTag, smth, previousTag) => {
    return targetTag === threshTag;
  });

  jest.mock("../src/scripts/update-volume", () => {
    const originalModule = jest.requireActual<
      typeof import("../src/scripts/update-volume")
    >("../src/scripts/update-volume");

    return {
      __esModule: true,
      ...originalModule,
      meetsSwitchThreshold: mockThresholdFn,
    };
  });

  await import("../src/scripts/update-volume").then((module) => {
    UpdateModule = module;
    jest.resetModules();
  });
}
