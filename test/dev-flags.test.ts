import { expect, test } from "@jest/globals";
import {
  ENABLE_VERBOSE_LOGGING,
  ENABLE_UPDATES_ON_LOAD,
  UPDATE_INTERVAL_MILLIS,
} from "../src/dev-flags";

/**
 * Make sure we didn't forget to reset dev flags before checking in
 */
test("dev flags are disabled", () => {
  expect(ENABLE_VERBOSE_LOGGING).toBe(false);
  expect(ENABLE_UPDATES_ON_LOAD).toBe(true);
  expect(UPDATE_INTERVAL_MILLIS).toBe(1600);
});
